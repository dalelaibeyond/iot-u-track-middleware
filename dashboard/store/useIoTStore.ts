import { create } from 'zustand';
import {
  DeviceMetadata,
  RackState,
  SUOUpdate,
  AnySUOUpdate,
  isSUODevModUpdate,
  isSUOHeartbeatUpdate,
} from '../types/schema';

interface IoTStore {
  deviceList: DeviceMetadata[];
  activeRack: RackState | null;
  activeDeviceId: string | null;
  activeModuleIndex: number | null;
  socketConnected: boolean;
  isNocMode: boolean;

  // Actions
  setDeviceList: (devices: DeviceMetadata[]) => void;
  setActiveSelection: (deviceId: string, moduleIndex: number) => void;
  setActiveRack: (rack: RackState) => void;
  setSocketConnected: (connected: boolean) => void;
  toggleNocMode: () => void;
  mergeUpdate: (suo: SUOUpdate) => void;
}

export const useIoTStore = create<IoTStore>((set, get) => ({
  deviceList: [],
  activeRack: null,
  activeDeviceId: null,
  activeModuleIndex: null,
  socketConnected: false,
  isNocMode: false,

  setDeviceList: devices => set({ deviceList: devices }),

  setActiveSelection: (deviceId, moduleIndex) =>
    set({
      activeDeviceId: deviceId,
      activeModuleIndex: moduleIndex,
    }),

  setActiveRack: rack => set({ activeRack: rack }),

  setSocketConnected: connected => set({ socketConnected: connected }),

  toggleNocMode: () => set(state => ({ isNocMode: !state.isNocMode })),

  mergeUpdate: (suo: SUOUpdate) => {
    const { deviceList, activeRack, activeDeviceId, activeModuleIndex } = get();

    // Backend middleware uses suoType (e.g., 'SUO_HEARTBEAT')
    const messageType = suo.suoType?.replace('SUO_', '') || '';

    console.log('[useIoTStore] mergeUpdate called:', {
      messageType,
      suoType: suo.suoType,
      deviceId: suo.deviceId,
      moduleIndex: suo.moduleIndex,
      activeDeviceId,
      activeModuleIndex,
    });

    // Branch 1: Metadata Update (Global) - SUO_DEV_MOD and SUO_HEARTBEAT (flat structure)
    if (isSUODevModUpdate(suo as AnySUOUpdate)) {
      // SUO_DEV_MOD: Flat structure, modules array at root level
      const existingDeviceIndex = deviceList.findIndex(d => d.deviceId === suo.deviceId);

      let updatedList;
      if (existingDeviceIndex >= 0) {
        updatedList = deviceList.map(d => {
          if (d.deviceId === suo.deviceId) {
            return {
              ...d,
              deviceType: suo.deviceType || d.deviceType,
              ip: suo.ip !== undefined ? suo.ip : d.ip,
              mac: suo.mac !== undefined ? suo.mac : d.mac,
              fwVer: suo.fwVer !== undefined ? suo.fwVer : d.fwVer,
              mask: suo.mask !== undefined ? suo.mask : d.mask,
              gwIp: suo.gwIp !== undefined ? suo.gwIp : d.gwIp,
              activeModules: Array.isArray(suo.modules) ? suo.modules : d.activeModules,
              isOnline: d.isOnline,
            };
          }
          return d;
        });
      } else {
        const newDevice: DeviceMetadata = {
          deviceId: String(suo.deviceId),
          deviceType: suo.deviceType || 'V5008',
          ip: suo.ip || null,
          mac: suo.mac || null,
          fwVer: suo.fwVer || null,
          mask: suo.mask || null,
          gwIp: suo.gwIp || null,
          isOnline: false,
          activeModules: Array.isArray(suo.modules) ? suo.modules : [],
        };
        updatedList = [...deviceList, newDevice];
      }
      set({ deviceList: updatedList });
    } else if (isSUOHeartbeatUpdate(suo as AnySUOUpdate)) {
      // SUO_HEARTBEAT: Flat structure, modules array at root level
      const existingDeviceIndex = deviceList.findIndex(d => d.deviceId === suo.deviceId);

      let updatedList;
      if (existingDeviceIndex >= 0) {
        updatedList = deviceList.map(d => {
          if (d.deviceId === suo.deviceId) {
            // Update modules from heartbeat (flat structure)
            let updatedModules = d.activeModules;
            if (Array.isArray(suo.modules)) {
              updatedModules = d.activeModules.map(m => {
                const hbModule = suo.modules?.find(hm => hm.moduleIndex === m.moduleIndex);
                if (hbModule) {
                  return {
                    ...m,
                    moduleId: hbModule.moduleId || m.moduleId,
                    uTotal: hbModule.uTotal,
                  };
                }
                return m;
              });

              // Add any new modules from heartbeat
              suo.modules.forEach(hbModule => {
                if (!updatedModules.find(m => m.moduleIndex === hbModule.moduleIndex)) {
                  updatedModules.push({
                    moduleIndex: hbModule.moduleIndex,
                    moduleId: hbModule.moduleId,
                    fwVer: null,
                    uTotal: hbModule.uTotal,
                  });
                }
              });
            }

            return {
              ...d,
              isOnline: true,
              activeModules: updatedModules,
            };
          }
          return d;
        });
      } else {
        // Add new device from heartbeat
        const newDevice: DeviceMetadata = {
          deviceId: String(suo.deviceId),
          deviceType: suo.deviceType || 'V5008',
          ip: null,
          mac: null,
          fwVer: null,
          mask: null,
          gwIp: null,
          isOnline: true,
          activeModules: Array.isArray(suo.modules)
            ? suo.modules.map(m => ({
                moduleIndex: m.moduleIndex,
                moduleId: m.moduleId,
                fwVer: null,
                uTotal: m.uTotal,
              }))
            : [],
        };
        updatedList = [...deviceList, newDevice];
      }
      set({ deviceList: updatedList });
    }

    // Branch 2: Rack Update (Context-Aware) - Only for single-module message types
    // Single-module types: SUO_RFID_SNAPSHOT, SUO_RFID_EVENT, SUO_TEMP_HUM, SUO_NOISE_LEVEL, SUO_DOOR_STATE, SUO_COMMAND_RESULT
    // Note: SUO_DEV_MOD and SUO_HEARTBEAT don't have moduleIndex at root level (flat structure)
    const suoDeviceId = String(suo.deviceId);
    const storeDeviceId = activeDeviceId ? String(activeDeviceId) : null;
    const suoModuleIndex = suo.moduleIndex !== undefined ? Number(suo.moduleIndex) : undefined;
    const storeModuleIndex = activeModuleIndex !== null ? Number(activeModuleIndex) : null;

    // For single-module messages, we need moduleIndex to match
    // For device-level messages (DEV_MOD, HEARTBEAT), we process them above and skip this branch
    const isSingleModuleMessage =
      suo.suoType &&
      [
        'SUO_RFID_SNAPSHOT',
        'SUO_RFID_EVENT',
        'SUO_TEMP_HUM',
        'SUO_NOISE_LEVEL',
        'SUO_DOOR_STATE',
        'SUO_COMMAND_RESULT',
      ].includes(suo.suoType);

    if (!isSingleModuleMessage) {
      // Device-level messages don't affect rack state directly (except HEARTBEAT which is handled above)
      return;
    }

    console.log('[useIoTStore] Context check:', {
      suoDeviceId,
      storeDeviceId,
      suoModuleIndex,
      storeModuleIndex,
      isSingleModuleMessage,
      deviceMatch: suoDeviceId === storeDeviceId,
      moduleMatch: suoModuleIndex === undefined || suoModuleIndex === storeModuleIndex,
    });

    if (
      storeDeviceId !== null &&
      (suoDeviceId !== storeDeviceId ||
        (suoModuleIndex !== undefined && suoModuleIndex !== storeModuleIndex))
    ) {
      console.log('[useIoTStore] Ignoring message - not for current view');
      return; // Ignore if not currently viewed
    }

    // If no activeRack exists, create a minimal one for this device/module
    let newRack;
    if (!activeRack) {
      newRack = {
        deviceId: suoDeviceId,
        moduleIndex: suoModuleIndex || 0,
        isOnline: true,
        rfidSnapshot: [],
        tempHum: [],
        noiseLevel: [],
        doorState: null,
        door1State: null,
        door2State: null,
      };
    } else {
      newRack = { ...activeRack };
    }

    // Middleware uses 'data' field instead of 'payload'
    const payload = suo.data || suo.payload;

    switch (messageType) {
      case 'TEMP_HUM':
      case 'QRY_TEMP_HUM_RESP':
        // Middleware sends temp/hum in data.sensors (SUO spec), also check root level for backward compatibility
        let tempHumData = null;
        if (suo.data?.sensors && Array.isArray(suo.data.sensors)) {
          tempHumData = suo.data.sensors;
        } else if (suo.tempHum && Array.isArray(suo.tempHum)) {
          tempHumData = suo.tempHum;
        } else if (payload?.sensors && Array.isArray(payload.sensors)) {
          tempHumData = payload.sensors;
        } else if (Array.isArray(payload)) {
          tempHumData = payload;
        }

        if (tempHumData && Array.isArray(tempHumData)) {
          newRack.tempHum = tempHumData;
        }
        break;
      case 'HEARTBEAT':
        newRack.isOnline = true;
        newRack.lastSeenHb = new Date().toISOString();
        break;
      case 'RFID_SNAPSHOT':
      case 'RFID_EVENT':
        console.log('[useIoTStore] Processing RFID:', {
          data: suo.data,
          rfidSnapshot: suo.rfidSnapshot,
          payload,
        });
        // Middleware sends RFID data in data.sensors (SUO spec), also check root level for backward compatibility
        let rfidData = null;
        if (suo.data?.sensors && Array.isArray(suo.data.sensors)) {
          // Middleware format: data.sensors[]
          rfidData = suo.data.sensors;
        } else if (suo.rfidSnapshot && Array.isArray(suo.rfidSnapshot)) {
          // Backward compatibility: rfidSnapshot at root level
          rfidData = suo.rfidSnapshot;
        } else if (payload?.sensors && Array.isArray(payload.sensors)) {
          // Backward compatibility: payload.sensors
          rfidData = payload.sensors;
        } else if (Array.isArray(payload)) {
          // Backward compatibility: payload is array directly
          rfidData = payload;
        }

        if (rfidData && Array.isArray(rfidData)) {
          // Full snapshot replacement
          console.log('[useIoTStore] Setting RFID snapshot with', rfidData.length, 'tags');
          newRack.rfidSnapshot = rfidData;
        } else if (rfidData && typeof rfidData === 'object') {
          // Single RFID event - merge into existing array
          console.log('[useIoTStore] Processing single RFID event:', rfidData);
          const currentRfid = newRack.rfidSnapshot || [];
          const updatedRfid = currentRfid.map(tag =>
            tag.sensorIndex === rfidData.sensorIndex ? { ...tag, ...rfidData } : tag
          );
          newRack.rfidSnapshot = updatedRfid;
        } else {
          console.log('[useIoTStore] No RFID data found');
        }
        break;
      case 'DOOR_STATE':
        // Middleware sends door state at root level: {door1State, door2State}
        // Also check payload for backward compatibility
        if (suo.door1State !== undefined) {
          newRack.door1State = suo.door1State;
        }
        if (suo.door2State !== undefined) {
          newRack.door2State = suo.door2State;
        }
        if (suo.doorState !== undefined) {
          newRack.doorState = suo.doorState;
        }
        // Also check payload for array format (backward compatibility)
        const doorData = Array.isArray(payload) ? payload[0] : payload;
        if (doorData) {
          if (doorData.door1State !== undefined) {
            newRack.door1State = doorData.door1State;
          }
          if (doorData.door2State !== undefined) {
            newRack.door2State = doorData.door2State;
          }
          if (doorData.doorState !== undefined) {
            newRack.doorState = doorData.doorState;
          }
        }
        break;
      case 'NOISE':
      case 'NOISE_LEVEL':
        // Middleware sends noise in data.sensors (SUO spec), also check root level for backward compatibility
        let noiseData = null;
        if (suo.data?.sensors && Array.isArray(suo.data.sensors)) {
          noiseData = suo.data.sensors;
        } else if (suo.noiseLevel && Array.isArray(suo.noiseLevel)) {
          noiseData = suo.noiseLevel;
        } else if (payload?.sensors && Array.isArray(payload.sensors)) {
          noiseData = payload.sensors;
        } else if (Array.isArray(payload)) {
          noiseData = payload;
        }

        if (noiseData && Array.isArray(noiseData)) {
          newRack.noiseLevel = noiseData;
        }
        break;
      case 'META_CHANGED_EVENT':
        // Metadata change notification - refresh device metadata from backend
        // The payload contains change descriptions we could show in a toast
        // For now, we just log it - the next DEVICE_METADATA will update the UI
        console.log('[Dashboard] Metadata changed:', payload);
        break;
    }

    set({ activeRack: newRack });
  },
}));
