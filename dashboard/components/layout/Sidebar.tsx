import React, { useState, useEffect } from 'react';
import { useIoTStore } from '../../store/useIoTStore';
import { Server, ChevronDown, ChevronRight, Circle, Octagon } from 'lucide-react';
import { cn } from '../../utils/cn';

export const Sidebar: React.FC = () => {
  const {
    deviceList,
    activeDeviceId,
    activeModuleIndex,
    setActiveSelection,
    isNocMode,
    socketConnected,
  } = useIoTStore();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [isVisible, setIsVisible] = useState(false);

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 200);
    return () => clearTimeout(timer);
  }, []);

  if (isNocMode) return null;

  return (
    <div className={cn('sidebar-container depth-layer-3', isVisible && 'animate-fade-in-up')}>
      <div className="sidebar-header">
        <div className="relative">
          <Server className="w-5 h-5 text-emerald-400 animate-breathe" />
          {!socketConnected && (
            <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500 animate-data-pulse" />
          )}
        </div>
        <h1 className="font-bold text-slate-100 tracking-tight">
          IoT Ops <span className="text-cyan-400 text-xs font-normal">v2.0</span>
        </h1>
      </div>

      <nav className="flex-1 p-2 space-y-1 relative z-10">
        <p className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          Data Center Map
        </p>

        {deviceList.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <div className="w-8 h-8 mx-auto mb-3 text-slate-600">
              <Octagon className="w-full h-full animate-pulse" />
            </div>
            <p className="text-xs text-slate-600">Scanning for devices...</p>
          </div>
        ) : (
          deviceList.map((device, deviceIndex) => (
            <div
              key={device.deviceId}
              className="space-y-1 animate-stagger-fade"
              style={{ animationDelay: `${deviceIndex * 0.05}s` }}
            >
              <button
                onClick={() => {
                  console.log('[Sidebar] Device clicked:', device.deviceId);
                  console.log('[Sidebar] Device data:', {
                    deviceId: device.deviceId,
                    hasActiveModules: !!device.activeModules,
                    activeModulesCount: device.activeModules?.length || 0,
                    modules: device.activeModules,
                  });
                  toggleExpand(device.deviceId);
                }}
                disabled={!device.activeModules || device.activeModules.length === 0}
                className={cn(
                  'sidebar-item-base w-full',
                  activeDeviceId === device.deviceId
                    ? 'sidebar-item-active'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 animate-micro-bounce',
                  (!device.activeModules || device.activeModules.length === 0) &&
                    'cursor-not-allowed opacity-50'
                )}
              >
                {expanded[device.deviceId] ? (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                )}
                <div className="flex-1 text-left flex items-center gap-2">
                  <Circle
                    className={cn(
                      'w-2 h-2 fill-current',
                      device.isOnline ? 'text-emerald-400' : 'text-slate-600'
                    )}
                  />
                  <span className="truncate font-mono text-[13px]">Dev-{device.deviceId}</span>
                </div>
              </button>

              {expanded[device.deviceId] && (
                <div className="ml-6 border-l border-slate-800 pl-2 space-y-1">
                  {device.activeModules.map((module, moduleIndex) => (
                    <button
                      key={`${device.deviceId}-${module.moduleIndex}`}
                      onClick={() => {
                        console.log(
                          '[Sidebar] Module clicked:',
                          device.deviceId,
                          'module:',
                          module.moduleIndex
                        );
                        setActiveSelection(device.deviceId, module.moduleIndex);
                      }}
                      className={cn(
                        'sidebar-subitem-base w-full text-left',
                        activeDeviceId === device.deviceId &&
                          activeModuleIndex === module.moduleIndex
                          ? 'sidebar-subitem-active'
                          : 'text-slate-500 hover:text-cyan-300 hover:bg-slate-800/30'
                      )}
                      style={{ animationDelay: `${(deviceIndex + moduleIndex) * 0.03}s` }}
                    >
                      <span className="font-mono text-[11px]">
                        Mod#{module.moduleIndex} ID#{module.moduleId} ({module.uTotal}U) FW:
                        {module.fwVer || 'N/A'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </nav>

      <div className="p-4 bg-slate-950/50 mt-auto border-t border-slate-800 relative z-10">
        <div className="flex items-center gap-2 text-[10px] text-emerald-400 mb-2 font-mono">
          <div
            className={cn(
              'w-2 h-2 rounded-full',
              socketConnected ? 'bg-emerald-400 animate-breathe' : 'bg-amber-500 animate-data-pulse'
            )}
          />
          {socketConnected ? 'SYSTEM LIVE' : 'CONNECTING'}
        </div>
        <div className="text-[10px] text-slate-600 font-mono">
          Last Check: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};
