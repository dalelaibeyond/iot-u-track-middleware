import type { DeviceMetadata, RackState } from '../../types/schema';

/**
 * Transform middleware device list to dashboardPro topology format
 */
export function adaptDeviceListToTopology(middlewareResponse: any): DeviceMetadata[] {
  if (!middlewareResponse.success || !Array.isArray(middlewareResponse.data)) {
    return [];
  }

  return middlewareResponse.data.map((device: any) => {
    // If full modules array is available (from detail API), use it
    // Otherwise create placeholder modules from moduleCount (from list API)
    const activeModules =
      device.modules?.length > 0
        ? device.modules.map((m: any) => ({
            moduleIndex: m.moduleIndex,
            moduleId: m.moduleId || '',
            uTotal: m.uTotal || 0,
            fwVer: m.fwVer || null,
          }))
        : Array.from({ length: device.moduleCount || 0 }, (_, i) => ({
            moduleIndex: i + 1,
            moduleId: '',
            uTotal: 0,
            fwVer: null,
          }));

    return {
      deviceId: device.deviceId,
      deviceType: device.deviceType,
      ip: device.ip,
      mac: device.mac || null,
      isOnline: device.isOnline,
      activeModules,
      fwVer: device.firmware?.version || null,
      mask: device.network?.mask || null,
      gwIp: device.network?.gwIp || null,
    };
  });
}

/**
 * Transform middleware device detail to dashboardPro rack state format
 */
export function adaptDeviceDetailToRackState(
  deviceDetail: any,
  moduleIndex: number
): RackState | null {
  if (!deviceDetail.success || !deviceDetail.data) {
    return null;
  }

  const device = deviceDetail.data;
  const module = device.modules?.find((m: any) => m.moduleIndex === moduleIndex);

  if (!module) {
    return null;
  }

  return {
    deviceId: device.deviceId,
    moduleIndex: module.moduleIndex,
    moduleId: module.moduleId,
    uTotal: module.uTotal,
    isOnline: module.isOnline,
    lastSeenHb: module.lastSeenHb,
    rfidSnapshot: module.telemetry?.rfidSnapshot?.data || [],
    tempHum: module.telemetry?.tempHum?.data || [],
    noiseLevel: module.telemetry?.noiseLevel?.data || [],
    doorState: module.telemetry?.doorState?.door1 ?? null,
    door1State: module.telemetry?.doorState?.door1 ?? null,
    door2State: module.telemetry?.doorState?.door2 ?? null,
  };
}
