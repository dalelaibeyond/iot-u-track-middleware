import apiClient from './client';
import { DeviceMetadata, RackState } from '../../types/schema';
import { validateDeviceListResponse, validateRackStateResponse } from '../utils/validation';
import { adaptDeviceListToTopology, adaptDeviceDetailToRackState } from './adapters';

/**
 * API endpoint functions for interacting with the IoT Middleware
 * Updated for Middleware API v1.0 Compatibility
 */

// ============================================================================
// Group A: Management API (Hot Path)
// ============================================================================

/**
 * Fetches the topology of all devices and their modules
 * ⚠️ WARNING: This returns BASIC device info only (moduleCount, not full modules array)
 * The modules will have empty moduleId and uTotal=0 placeholders
 *
 * FOR INITIAL APP LOAD: Use getEnrichedTopology() instead to get complete module data
 * This function is kept for lightweight polling where module details aren't needed
 *
 * Middleware API: GET /api/v1/devices
 * @returns Promise<DeviceMetadata[]> - Array of device metadata with online status (incomplete modules)
 */
export const getTopology = async (): Promise<DeviceMetadata[]> => {
  const response = await apiClient.get<any>('/devices');
  console.log('[API] getTopology raw response:', response.data);
  const adaptedData = adaptDeviceListToTopology(response.data);
  console.log('[API] getTopology adapted data:', adaptedData);
  return validateDeviceListResponse(adaptedData);
};

/**
 * Fetches enriched topology with full device details for each device
 * This ensures moduleId and uTotal are populated from device detail API
 * @returns Promise<DeviceMetadata[]> - Array of device metadata with complete module info
 */
export const getEnrichedTopology = async (): Promise<DeviceMetadata[]> => {
  // First get basic topology (list of devices)
  const basicTopology = await getTopology();

  // Fetch full details for each device to get complete module data
  const enrichedDevices = await Promise.all(
    basicTopology.map(async device => {
      try {
        const detailResponse = await apiClient.get<any>(`/devices/${device.deviceId}`);
        console.log(`[API] Device detail for ${device.deviceId}:`, detailResponse.data);

        // Merge basic device info with detailed module data
        if (detailResponse.data?.success && detailResponse.data?.data?.modules) {
          return {
            ...device,
            activeModules: detailResponse.data.data.modules.map((m: any) => ({
              moduleIndex: m.moduleIndex,
              moduleId: m.moduleId || '',
              uTotal: m.uTotal || 0,
              fwVer: m.fwVer || null,
            })),
            fwVer: detailResponse.data.data.firmware?.version || device.fwVer,
            mask: detailResponse.data.data.network?.mask || device.mask,
            gwIp: detailResponse.data.data.network?.gwIp || device.gwIp,
          };
        }
        return device;
      } catch (err) {
        console.warn(`[API] Failed to fetch details for device ${device.deviceId}:`, err);
        return device;
      }
    })
  );

  console.log('[API] Enriched topology:', enrichedDevices);
  return enrichedDevices;
};

/**
 * Fetches the state of a specific rack (device module)
 * Middleware API: GET /api/v1/devices/:deviceId (extracts specific module)
 * @param deviceId - The ID of the device
 * @param moduleIndex - The index of the module/rack
 * @returns Promise<RackState | null> - The current state of the rack
 */
export const getRackState = async (
  deviceId: string,
  moduleIndex: number
): Promise<RackState | null> => {
  const response = await apiClient.get<any>(`/devices/${deviceId}`);
  const adaptedData = adaptDeviceDetailToRackState(response.data, moduleIndex);

  if (!adaptedData) {
    throw new Error(`Module ${moduleIndex} not found for device ${deviceId}`);
  }

  const validatedData = validateRackStateResponse(adaptedData);
  if (!validatedData) {
    throw new Error(`Invalid rack state data for device ${deviceId}, module ${moduleIndex}`);
  }
  return validatedData;
};

/**
 * Sends a control command to a specific device
 * Middleware API: POST /api/v1/commands
 * @param deviceId - The ID of the device
 * @param deviceType - The type of device (V5008 or V6800)
 * @param command - The type of command (e.g., QUERY_RFID_SNAPSHOT)
 * @param moduleIndex - The module index (optional)
 * @param uIndex - The U index for rack-specific commands (optional)
 * @param payload - Additional command payload (optional)
 * @returns Promise<{ status: string; commandId: string }> - Command confirmation
 */
export const sendCommand = async (
  deviceId: string,
  deviceType: string,
  command: string,
  moduleIndex?: number,
  uIndex?: number,
  payload?: any
): Promise<{ status: string; commandId: string }> => {
  const response = await apiClient.post<{ status: string; commandId: string }>('/commands', {
    deviceId,
    deviceType,
    command,
    ...(moduleIndex !== undefined && { moduleIndex }),
    ...(uIndex !== undefined && { uIndex }),
    ...(payload && { ...payload }),
  });
  return response.data;
};

// ============================================================================
// Group S: System API
// ============================================================================

/**
 * Checks the health status of the middleware
 * Middleware API: GET /health (root level)
 * @returns Promise<{ status: string; services: any }> - Health status
 */
export const getHealthStatus = async (): Promise<{
  status: string;
  services: any;
}> => {
  const response = await apiClient.get<{ status: string; services: any }>('/health');
  return response.data;
};

// ============================================================================
// Group E: History API (Cold Path)
// ============================================================================

/**
 * Fetches historical events (RFID/Door) from the database
 * @param params - Query parameters
 * @returns Promise<any[]> - Array of historical events
 */
export const getHistoryEvents = async (params?: {
  deviceId?: string;
  moduleIndex?: number;
  eventType?: 'rfid' | 'door';
  limit?: number;
  offset?: number;
}): Promise<any[]> => {
  const response = await apiClient.get<any[]>('/api/history/events', {
    params,
  });
  return response.data;
};

/**
 * Fetches historical telemetry data (Temp/Hum/Noise) from the database
 * @param params - Query parameters
 * @returns Promise<any[]> - Array of historical telemetry data
 */
export const getHistoryTelemetry = async (params?: {
  deviceId?: string;
  moduleIndex?: number;
  type?: 'tempHum' | 'noiseLevel';
  startTime?: string;
  endTime?: string;
  limit?: number;
}): Promise<any[]> => {
  const response = await apiClient.get<any[]>('/api/history/telemetry', {
    params,
  });
  return response.data;
};

/**
 * Fetches audit log (config changes) from the database
 * @param params - Query parameters
 * @returns Promise<any[]> - Array of audit events
 */
export const getHistoryAudit = async (params?: {
  deviceId?: string;
  limit?: number;
  offset?: number;
}): Promise<any[]> => {
  const response = await apiClient.get<any[]>('/api/history/audit', {
    params,
  });
  return response.data;
};

/**
 * Fetches device list from database history
 * @param params - Query parameters
 * @returns Promise<any[]> - Array of devices from history
 */
export const getHistoryDevices = async (params?: {
  limit?: number;
  offset?: number;
}): Promise<any[]> => {
  const response = await apiClient.get<any[]>('/api/history/devices', {
    params,
  });
  return response.data;
};

// ============================================================================
// Backward Compatibility (Deprecated)
// ============================================================================

/**
 * @deprecated Use getTopology() instead
 * Fetches the list of all devices with their metadata
 */
export const getDevices = async (): Promise<DeviceMetadata[]> => {
  console.warn('[DEPRECATED] getDevices() is deprecated, use getTopology() instead');
  return getTopology();
};
