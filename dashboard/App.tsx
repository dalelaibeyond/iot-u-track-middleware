import React, { useEffect, useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { DoorPanel } from './components/rack/DoorPanel';
import { RackStrip } from './components/rack/RackStrip';
import { EnvList } from './components/rack/EnvList';
import { useIoTStore } from './store/useIoTStore';
import { useSocket } from './hooks/useSocket';
import { getEnrichedTopology, getRackState } from './src/api/endpoints';
import { FullPageLoader } from './components/ui/LoadingIndicator';
import { Loader2, MonitorOff, Activity, Maximize2, Zap } from 'lucide-react';
import { cn } from './utils/cn';

const App: React.FC = () => {
  const {
    activeDeviceId,
    activeModuleIndex,
    activeRack,
    deviceList,
    isNocMode,
    setDeviceList,
    setActiveRack,
    setActiveSelection,
    socketConnected,
  } = useIoTStore();

  const [loading, setLoading] = useState(true);
  const [isBootSequence, setIsBootSequence] = useState(true);
  const { send } = useSocket();

  useEffect(() => {
    const init = async () => {
      try {
        // IMPORTANT: Use getEnrichedTopology (not getTopology) to get full module data
        // getTopology only returns moduleCount with placeholders (empty moduleId, uTotal=0)
        // getEnrichedTopology fetches device details to populate moduleId and uTotal
        const devices = await getEnrichedTopology();
        setDeviceList(devices);
        if (devices.length > 0) {
          const firstDevice = devices[0];
          const firstModuleIndex =
            firstDevice.activeModules.length > 0 ? firstDevice.activeModules[0].moduleIndex : 0;
          setActiveSelection(firstDevice.deviceId, firstModuleIndex);
        }
      } catch (err) {
        console.error('Initialization failed', err);
      } finally {
        setTimeout(() => {
          setLoading(false);
          setTimeout(() => setIsBootSequence(false), 500);
        }, 1200);
      }
    };
    init();
  }, [setDeviceList, setActiveSelection]);

  // Auto-correct selection if active module was removed (e.g., "Zero Module" case)
  useEffect(() => {
    if (activeDeviceId && activeModuleIndex !== null) {
      const activeDeviceMeta = deviceList.find(d => d.deviceId === activeDeviceId);
      if (activeDeviceMeta) {
        const activeModuleExists = activeDeviceMeta.activeModules.some(
          m => m.moduleIndex === activeModuleIndex
        );
        // If module no longer exists but device has other modules, select first available
        if (!activeModuleExists && activeDeviceMeta.activeModules.length > 0) {
          const firstModuleIndex = activeDeviceMeta.activeModules[0].moduleIndex;
          setActiveSelection(activeDeviceId, firstModuleIndex);
        }
      }
    }
  }, [deviceList, activeDeviceId, activeModuleIndex, setActiveSelection]);

  useEffect(() => {
    if (activeDeviceId && activeModuleIndex !== null) {
      const fetchDetail = async () => {
        try {
          const state = await getRackState(activeDeviceId, activeModuleIndex);
          setActiveRack(state);
        } catch (err) {
          console.error('Failed to fetch rack state:', err);
          setActiveRack(null); // Clear rack state on error
        }
      };
      fetchDetail();
    }
  }, [activeDeviceId, activeModuleIndex, setActiveRack]);

  // Subscribe to WebSocket events for current device
  useEffect(() => {
    if (activeDeviceId && send) {
      const subscribe = {
        type: 'subscribe',
        devices: [activeDeviceId],
        types: [
          'SUO_DEV_MOD',
          'SUO_HEARTBEAT',
          'SUO_TEMP_HUM',
          'SUO_RFID_SNAPSHOT',
          'SUO_DOOR_STATE',
          'SUO_NOISE_LEVEL',
        ],
      };

      const result = send(subscribe);
      if (result) {
        console.log('[App.tsx] WebSocket subscription sent for device:', activeDeviceId);
      } else {
        console.error('[App.tsx] Failed to send WebSocket subscription');
      }
    }
  }, [activeDeviceId, send]);

  if (loading) {
    return <FullPageLoader text="Digital Twin Initializing..." />;
  }

  const activeDeviceMeta = deviceList.find(d => d.deviceId === activeDeviceId);

  const uTotal =
    activeDeviceMeta?.activeModules.find(m => m.moduleIndex === activeModuleIndex)?.uTotal || 42;

  return (
    <div className="app-root">
      <Sidebar />

      <main className="app-main">
        <TopBar />

        {activeRack ? (
          <div className={cn('app-grid', isNocMode && 'app-grid-noc')}>
            {/* Zone A: Security */}
            {!isNocMode && (
              <section
                className={cn(
                  'app-zone-section depth-layer-2',
                  isBootSequence ? 'animate-stagger-fade' : 'animate-fade-in-up'
                )}
              >
                <DoorPanel
                  doorState={activeRack.doorState}
                  door1State={activeRack.door1State}
                  door2State={activeRack.door2State}
                />
              </section>
            )}

            {/* Zone B: Rack Visualizer - Center Stage */}
            <section
              className={cn(
                'app-rack-section depth-layer-1',
                isNocMode && 'app-rack-noc',
                isBootSequence ? 'animate-stagger-fade' : 'animate-fade-in-up'
              )}
            >
              <div className="app-badge depth-layer-3">
                <div className="app-badge-inner">
                  {isNocMode ? (
                    <>
                      <Maximize2 className="w-3 h-3 text-emerald-400" />
                      <span className="app-badge-text">NOC FOCUS</span>
                    </>
                  ) : (
                    <>
                      <Activity className="w-3 h-3 text-emerald-400 animate-breathe" />
                      <span className="app-badge-text">LIVE TWIN</span>
                    </>
                  )}
                  {!socketConnected && (
                    <div className="ml-2 w-2 h-2 rounded-full bg-amber-500 animate-data-pulse" />
                  )}
                </div>
              </div>
              {isNocMode && <div className="scanline-overlay" />}
              <RackStrip uTotal={uTotal} rfidData={activeRack.rfidSnapshot || []} />
            </section>

            {/* Zone C: Environment */}
            {!isNocMode && (
              <section
                className={cn(
                  'app-zone-section depth-layer-2',
                  isBootSequence ? 'animate-stagger-fade' : 'animate-fade-in-up'
                )}
              >
                <EnvList tempHum={activeRack.tempHum || []} noise={activeRack.noiseLevel || []} />
              </section>
            )}
          </div>
        ) : (
          <div className="app-empty-state">
            <div className="mb-4">
              <Zap className="w-16 h-16 opacity-20 text-slate-500 animate-pulse" />
            </div>
            <div className="text-center max-w-xs">
              <h2 className="text-lg font-bold text-slate-400 mb-2">No Active Stream</h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                Select a device and module from the sidebar to initialize the digital twin
                visualization.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
