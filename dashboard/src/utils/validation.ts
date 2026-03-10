import { DeviceMetadata, RackState, SUOUpdate, SUOType } from '../../types/schema';

/**
 * Type guard to check if a value is a valid MessageType
 * Supports both middleware suoType format and dashboard messageType format
 */
export const isValidSUOType = (value: string): value is SUOType => {
  const validTypes = [
    // Backend SUO message types only
    'SUO_DEV_MOD',
    'SUO_HEARTBEAT',
    'SUO_TEMP_HUM',
    'SUO_RFID_SNAPSHOT',
    'SUO_RFID_EVENT',
    'SUO_DOOR_STATE',
    'SUO_NOISE_LEVEL',
    'SUO_COMMAND_RESULT',
  ];
  return validTypes.includes(value);
};

/**
 * Validates structure of a DeviceMetadata object
 */
export const validateDeviceMetadata = (data: any): data is DeviceMetadata => {
  const deviceId = data.deviceId;
  const deviceType = data.deviceType;
  const ip = data.ip;
  const fwVer = data.fwVer;
  const modules = data.activeModules;

  const hasDeviceId = data && typeof deviceId === 'string';
  const hasDeviceType = typeof deviceType === 'string';
  // ip can be null when device hasn't reported yet
  const hasValidIp = ip === null || ip === undefined || typeof ip === 'string';
  const hasValidFwVer = fwVer === null || fwVer === undefined || typeof fwVer === 'string';
  const hasValidOnline = data.isOnline === undefined || typeof data.isOnline === 'boolean';
  const hasValidModules =
    Array.isArray(modules) &&
    modules.every(
      (module: any) =>
        typeof module.moduleIndex === 'number' &&
        (module.moduleId === null ||
          module.moduleId === undefined ||
          typeof module.moduleId === 'string') &&
        typeof module.uTotal === 'number'
    );

  const isValid =
    hasDeviceId &&
    hasDeviceType &&
    hasValidIp &&
    hasValidFwVer &&
    hasValidOnline &&
    hasValidModules;

  if (!isValid) {
    console.log('[DEBUG] Device validation failed for:', deviceId, {
      hasDeviceId,
      hasDeviceType,
      deviceType,
      hasValidIp,
      ip,
      hasValidFwVer,
      fwVer,
      hasValidOnline,
      hasValidModules,
      modules,
      data,
    });
  }

  return isValid;
};

/**
 * Validates structure of a RackState object
 * Note: Makes sensor arrays optional to support partial data from API
 */
export const validateRackState = (data: any): data is RackState => {
  return (
    data &&
    typeof data.deviceId === 'string' &&
    typeof data.moduleIndex === 'number' &&
    typeof data.isOnline === 'boolean' &&
    // Sensor arrays are optional - if present, must be arrays
    (data.rfidSnapshot === undefined || Array.isArray(data.rfidSnapshot)) &&
    (data.tempHum === undefined || Array.isArray(data.tempHum)) &&
    (data.noiseLevel === undefined || Array.isArray(data.noiseLevel)) &&
    // Door states can be null or undefined
    (data.doorState === undefined ||
      data.doorState === null ||
      typeof data.doorState === 'number') &&
    (data.door1State === undefined ||
      data.door1State === null ||
      typeof data.door1State === 'number') &&
    (data.door2State === undefined ||
      data.door2State === null ||
      typeof data.door2State === 'number')
  );
};

/**
 * Validates structure of a SUOUpdate object
 * Supports both middleware format (suoType, data) and dashboard format (messageType, payload)
 */
export const validateSUOUpdate = (data: any): data is SUOUpdate => {
  if (!data || typeof data.deviceId !== 'string') {
    console.log('[validateSUOUpdate] FAILED: no data or invalid deviceId', { data });
    return false;
  }

  // Check for SUO type from middleware
  const suoType = data.suoType;
  if (!suoType || !isValidSUOType(suoType)) {
    console.log('[validateSUOUpdate] FAILED: invalid suoType', { suoType, data });
    return false;
  }

  // moduleIndex is optional (null/undefined) but must be a number if present
  if (
    data.moduleIndex !== null &&
    data.moduleIndex !== undefined &&
    typeof data.moduleIndex !== 'number'
  ) {
    console.log('[validateSUOUpdate] FAILED: invalid moduleIndex', {
      moduleIndex: data.moduleIndex,
    });
    return false;
  }

  // Middleware uses 'data' field OR has fields directly at root level
  // Check for either nested data structure or flat structure
  const hasData = data.data !== undefined;
  const hasPayload = data.payload !== undefined;
  // Flat structure: has device metadata fields directly at root
  const hasFlatStructure =
    data.ip !== undefined ||
    data.fwVer !== undefined ||
    data.modules !== undefined ||
    data.sensors !== undefined ||
    data.door1State !== undefined ||
    data.door2State !== undefined;

  const isValid = hasData || hasPayload || hasFlatStructure;

  if (!isValid) {
    console.log('[validateSUOUpdate] FAILED: no data structure found', {
      hasData,
      hasPayload,
      hasFlatStructure,
      data,
    });
  }

  return isValid;
};

/**
 * Validates and parses a WebSocket message
 * Supports both middleware format and dashboard format
 */
export const validateWebSocketMessage = (message: string): SUOUpdate | null => {
  try {
    const parsed = JSON.parse(message);

    // Handle middleware WebSocket server message format
    // Middleware sends: {type: "data", data: {messageType, deviceId, ...}}
    // Dashboard expects: {messageType, deviceId, ...}
    if (parsed.type === 'data' && parsed.data) {
      // Extract the data payload from middleware message format
      const data = parsed.data;
      if (validateSUOUpdate(data)) {
        return data;
      }
      console.error('Invalid WebSocket data payload:', data);
      return null;
    }

    // Handle direct dashboard format (for compatibility)
    if (validateSUOUpdate(parsed)) {
      return parsed;
    }

    // Ignore middleware control messages (connected, ready, command_ack, etc.)
    if (parsed.type === 'connected' || parsed.type === 'ready' || parsed.type === 'command_ack') {
      return null; // These are control messages, not data updates
    }

    console.error('Invalid WebSocket message structure:', parsed);
    return null;
  } catch (error) {
    console.error('Error parsing WebSocket message:', error);
    return null;
  }
};

/**
 * Validates an API response for device list
 */
export const validateDeviceListResponse = (data: any): DeviceMetadata[] => {
  if (!Array.isArray(data)) {
    console.error('Device list response is not an array');
    return [];
  }

  return data.filter(validateDeviceMetadata);
};

/**
 * Validates an API response for rack state
 */
export const validateRackStateResponse = (data: any): RackState | null => {
  if (validateRackState(data)) {
    return data;
  }

  console.error('Invalid rack state response:', data);
  return null;
};
