/**
 * SUO (Standard Unified Object) Type Definitions
 *
 * Based on: SUO_UOS_DB_Spec.md
 *
 * SUO is the enriched format after transforming SIF messages.
 * Contains server-side metadata and unified structure for all device types.
 */

/**
 * SUO Message Type
 * All possible SUO message types
 */
export type SUOType =
  | 'SUO_DEV_MOD'
  | 'SUO_HEARTBEAT'
  | 'SUO_RFID_SNAPSHOT'
  | 'SUO_RFID_EVENT'
  | 'SUO_TEMP_HUM'
  | 'SUO_NOISE_LEVEL'
  | 'SUO_DOOR_STATE'
  | 'SUO_COMMAND_RESULT';

/**
 * Base SUO Message interface
 * All SUO messages extend this interface
 */
export interface SUOMessage {
  suoType: SUOType;
  deviceId: string;
  deviceType: 'V5008' | 'V6800';
  moduleIndex: number | null;
  moduleId: string | null;
  serverTimestamp: string; // ISO8601 format
  deviceTimestamp: string | null; // ISO8601 format or null
  messageId: string;
  data: unknown;
}

/**
 * SUO_DEV_MOD - Device and module metadata
 * Sources: V5008 DEVICE_INFO/MODULE_INFO/HEARTBEAT, V6800 DEV_MOD_INFO/MOD_CHNG_EVENT
 * Note: Flat structure without moduleIndex/moduleId at root and without nested data object
 */
export interface SUODevMod {
  suoType: 'SUO_DEV_MOD';
  deviceId: string;
  deviceType: 'V5008' | 'V6800';
  serverTimestamp: string;
  deviceTimestamp: string | null;
  messageId: string;
  ip: string | null;
  mask: string | null;
  gwIp: string | null;
  mac: string | null;
  model: string | null;
  fwVer: string | null;
  modules: Array<{
    moduleIndex: number;
    moduleId: string;
    fwVer: string;
    uTotal: number;
  }>;
}

/**
 * SUO_HEARTBEAT - Device heartbeat status
 * Sources: V5008 HEARTBEAT, V6800 HEARTBEAT
 * Note: Flat structure without moduleIndex/moduleId at root and without nested data object
 */
export interface SUOHeartbeat {
  suoType: 'SUO_HEARTBEAT';
  deviceId: string;
  deviceType: 'V5008' | 'V6800';
  serverTimestamp: string;
  deviceTimestamp: string | null;
  messageId: string;
  meta?: {
    busVoltage: string | null; // V6800 only
    busCurrent: string | null; // V6800 only
    mainPower: number | null; // V6800 only
    backupPower: number | null; // V6800 only
  };
  modules: Array<{
    moduleIndex: number;
    moduleId: string;
    uTotal: number;
  }>;
}

/**
 * SUO_RFID_SNAPSHOT - Current RFID tag states for a specific module
 * Sources: V5008 RFID_SNAPSHOT, V6800 RFID_SNAPSHOT
 */
export interface SUORfidSnapshot extends SUOMessage {
  suoType: 'SUO_RFID_SNAPSHOT';
  moduleIndex: number;
  moduleId: string;
  data: {
    sensors: Array<{
      sensorIndex: number;
      tagId: string | null;
      isAlarm: boolean;
    }>;
  };
}

/**
 * SUO_RFID_EVENT - RFID attach/detach event for a specific module
 * Sources: V6800 RFID_EVENT only
 */
export interface SUORfidEvent extends SUOMessage {
  suoType: 'SUO_RFID_EVENT';
  moduleIndex: number;
  moduleId: string;
  data: {
    sensorIndex: number;
    tagId: string;
    action: 'ATTACHED' | 'DETACHED';
    isAlarm: boolean;
  };
}

/**
 * SUO_TEMP_HUM - Temperature and humidity readings for a specific module
 * Sources: V5008 TEMP_HUM, V6800 TEMP_HUM/QUERY_TEMP_HUM_RESP
 */
export interface SUOTempHum extends SUOMessage {
  suoType: 'SUO_TEMP_HUM';
  moduleIndex: number;
  moduleId: string;
  data: {
    sensors: Array<{
      sensorIndex: number;
      temp: number | null;
      hum: number | null;
    }>;
  };
}

/**
 * SUO_NOISE_LEVEL - Noise level readings for a specific module
 * Sources: V5008 NOISE_LEVEL only
 */
export interface SUONoiseLevel extends SUOMessage {
  suoType: 'SUO_NOISE_LEVEL';
  moduleIndex: number;
  moduleId: string;
  data: {
    sensors: Array<{
      sensorIndex: number;
      noise: number | null;
    }>;
  };
}

/**
 * SUO_DOOR_STATE - Door open/close state for a specific module
 * Sources: V5008 DOOR_STATE, V6800 DOOR_STATE_EVENT/QUERY_DOOR_STATE_RESP
 */
export interface SUODoorState extends SUOMessage {
  suoType: 'SUO_DOOR_STATE';
  moduleIndex: number;
  moduleId: string | null; // null for V6800 QUERY_DOOR_STATE_RESP
  door1State: number; // 0=closed, 1=open
  door2State: number | null; // null for single door sensors
  data: Record<string, never>; // Empty object (fields at root level)
}

/**
 * SUO_COMMAND_RESULT - Command response result message
 * Sources: V5008 QUERY_COLOR_RESP/SET_COLOR_RESP/CLEAR_ALARM_RESP,
 *          V6800 SET_COLOR_RESP/QUERY_COLOR_RESP/CLEAR_ALARM_RESP
 */
export interface SUOCommandResult extends SUOMessage {
  suoType: 'SUO_COMMAND_RESULT';
  moduleIndex: number;
  moduleId: string;
  data: {
    commandType: string;
    result: 'Success' | 'Failure';
    originalReq: string | null; // Hex string, V5008 only
    colorCodes?: number[]; // QUERY_COLOR_RESP only, flat array
    sensorIndex?: number | null; // CLEAR_ALARM_RESP only, V5008 only
  };
}

/**
 * Union type of all SUO messages
 */
export type AnySUOMessage =
  | SUODevMod
  | SUOHeartbeat
  | SUORfidSnapshot
  | SUORfidEvent
  | SUOTempHum
  | SUONoiseLevel
  | SUODoorState
  | SUOCommandResult;

/**
 * Device info completion status for SUO_DEV_MOD messages
 * Used by SmartHB to determine when device info is complete enough
 */
export interface DeviceInfoCompletionStatus {
  isComplete: boolean;
  missingFields: string[];
  missingModuleFields: Array<{
    moduleIndex: number;
    fields: string[];
  }>;
}

/**
 * Check if a SUO_DEV_MOD message has complete device information
 *
 * Completion requires:
 * - Device: ip, mac, fwVer, mask, gwIp (all non-null and non-empty)
 * - Modules: all modules have moduleId, fwVer, uTotal (non-null/empty/non-zero)
 *
 * @param devMod The SUO_DEV_MOD message to check
 * @returns DeviceInfoCompletionStatus with detailed missing field information
 */
export function checkDeviceInfoCompletion(devMod: SUODevMod): DeviceInfoCompletionStatus {
  const missingFields: string[] = [];
  const missingModuleFields: Array<{ moduleIndex: number; fields: string[] }> = [];

  // Check device-level required fields (device-type specific)
  // V6800 only requires ip and mac (protocol design)
  // V5008 requires all fields: ip, mac, fwVer, mask, gwIp
  if (!devMod.ip) missingFields.push('ip');
  if (!devMod.mac) missingFields.push('mac');

  // V5008-specific required fields
  if (devMod.deviceType === 'V5008') {
    if (!devMod.fwVer) missingFields.push('fwVer');
    if (!devMod.mask) missingFields.push('mask');
    if (!devMod.gwIp) missingFields.push('gwIp');
  }

  // Check if modules array is empty - this is incomplete
  if (devMod.modules.length === 0) {
    missingFields.push('modules');
  } else {
    // Check each module for required fields
    for (const module of devMod.modules) {
      const moduleMissingFields: string[] = [];

      if (!module.moduleId) moduleMissingFields.push('moduleId');
      if (!module.fwVer) moduleMissingFields.push('fwVer');
      if (module.uTotal === null || module.uTotal === undefined || module.uTotal === 0) {
        moduleMissingFields.push('uTotal');
      }

      if (moduleMissingFields.length > 0) {
        missingModuleFields.push({
          moduleIndex: module.moduleIndex,
          fields: moduleMissingFields,
        });
      }
    }
  }

  const isComplete = missingFields.length === 0 && missingModuleFields.length === 0;

  return {
    isComplete,
    missingFields,
    missingModuleFields,
  };
}

/**
 * Merge two SUO_DEV_MOD messages
 *
 * Merge rules:
 * - Device metadata fields (serverTimestamp, deviceTimestamp, messageId): use incoming
 * - Device data fields: preserve existing non-null values, override with incoming non-null values
 * - Modules: merge by moduleIndex, preserve existing fields when incoming has null/empty values
 * - Result: modules sorted by moduleIndex ascending
 *
 * @param existing The existing SUO_DEV_MOD message (base)
 * @param incoming The incoming SUO_DEV_MOD message (updates)
 * @returns New SUO_DEV_MOD with merged data
 */
export function mergeSUODevMod(existing: SUODevMod, incoming: SUODevMod): SUODevMod {
  return {
    ...existing,
    serverTimestamp: incoming.serverTimestamp,
    deviceTimestamp: incoming.deviceTimestamp,
    messageId: incoming.messageId,
    ip: incoming.ip ?? existing.ip,
    mask: incoming.mask ?? existing.mask,
    gwIp: incoming.gwIp ?? existing.gwIp,
    mac: incoming.mac ?? existing.mac,
    model: incoming.model ?? existing.model,
    fwVer: incoming.fwVer ?? existing.fwVer,
    modules: mergeModules(existing.modules, incoming.modules),
  };
}

/**
 * Helper function to merge module arrays
 *
 * Merge rules:
 * - Modules are matched by moduleIndex
 * - For each moduleIndex, preserve existing fields when incoming has null/empty/zero values
 * - Override with incoming non-null/non-empty/non-zero values
 * - Return modules sorted by moduleIndex ascending
 *
 * @param existingModules Array of existing modules
 * @param incomingModules Array of incoming modules
 * @returns Merged and sorted array of modules
 */
function mergeModules(
  existingModules: Array<{
    moduleIndex: number;
    moduleId: string;
    fwVer: string;
    uTotal: number;
  }>,
  incomingModules: Array<{
    moduleIndex: number;
    moduleId: string;
    fwVer: string;
    uTotal: number;
  }>
): Array<{
  moduleIndex: number;
  moduleId: string;
  fwVer: string;
  uTotal: number;
}> {
  // Create a map of existing modules by index
  const moduleMap = new Map<
    number,
    {
      moduleIndex: number;
      moduleId: string;
      fwVer: string;
      uTotal: number;
    }
  >();

  // Add existing modules to map
  for (const module of existingModules) {
    moduleMap.set(module.moduleIndex, { ...module });
  }

  // Merge incoming modules
  for (const incomingModule of incomingModules) {
    const existingModule = moduleMap.get(incomingModule.moduleIndex);

    if (existingModule) {
      // Merge with existing - preserve non-null values from incoming
      moduleMap.set(incomingModule.moduleIndex, {
        moduleIndex: incomingModule.moduleIndex,
        moduleId: incomingModule.moduleId || existingModule.moduleId,
        fwVer: incomingModule.fwVer || existingModule.fwVer,
        uTotal: incomingModule.uTotal !== 0 ? incomingModule.uTotal : existingModule.uTotal,
      });
    } else {
      // New module - add as-is
      moduleMap.set(incomingModule.moduleIndex, { ...incomingModule });
    }
  }

  // Convert map back to array and sort by moduleIndex
  return Array.from(moduleMap.values()).sort((a, b) => a.moduleIndex - b.moduleIndex);
}

/**
 * Base interface for type guards - only requires suoType
 */
interface SUOMessageBase {
  suoType: SUOType;
}

/**
 * Type guard functions for SUO messages
 */
export function isSUODevMod(msg: SUOMessageBase): msg is SUODevMod {
  return msg.suoType === 'SUO_DEV_MOD';
}

export function isSUOHeartbeat(msg: SUOMessageBase): msg is SUOHeartbeat {
  return msg.suoType === 'SUO_HEARTBEAT';
}

export function isSUORfidSnapshot(msg: SUOMessageBase): msg is SUORfidSnapshot {
  return msg.suoType === 'SUO_RFID_SNAPSHOT';
}

export function isSUORfidEvent(msg: SUOMessageBase): msg is SUORfidEvent {
  return msg.suoType === 'SUO_RFID_EVENT';
}

export function isSUOTempHum(msg: SUOMessageBase): msg is SUOTempHum {
  return msg.suoType === 'SUO_TEMP_HUM';
}

export function isSUONoiseLevel(msg: SUOMessageBase): msg is SUONoiseLevel {
  return msg.suoType === 'SUO_NOISE_LEVEL';
}

export function isSUODoorState(msg: SUOMessageBase): msg is SUODoorState {
  return msg.suoType === 'SUO_DOOR_STATE';
}

export function isSUOCommandResult(msg: SUOMessageBase): msg is SUOCommandResult {
  return msg.suoType === 'SUO_COMMAND_RESULT';
}

/**
 * SIF to SUO message type mapping
 * Maps SIF message types to their corresponding SUO types
 */
export const SIFToSUOTypeMap: Record<string, SUOType> = {
  // V5008 mappings
  DEVICE_INFO: 'SUO_DEV_MOD',
  MODULE_INFO: 'SUO_DEV_MOD',
  HEARTBEAT: 'SUO_HEARTBEAT',
  RFID_SNAPSHOT: 'SUO_RFID_SNAPSHOT',
  TEMP_HUM: 'SUO_TEMP_HUM',
  NOISE_LEVEL: 'SUO_NOISE_LEVEL',
  DOOR_STATE: 'SUO_DOOR_STATE',
  QUERY_COLOR_RESP: 'SUO_COMMAND_RESULT',
  SET_COLOR_RESP: 'SUO_COMMAND_RESULT',
  CLEAR_ALARM_RESP: 'SUO_COMMAND_RESULT',

  // V6800 mappings
  DEV_MOD_INFO: 'SUO_DEV_MOD',
  MOD_CHNG_EVENT: 'SUO_DEV_MOD',
  RFID_EVENT: 'SUO_RFID_EVENT',
  QUERY_TEMP_HUM_RESP: 'SUO_TEMP_HUM',
  DOOR_STATE_EVENT: 'SUO_DOOR_STATE',
  QUERY_DOOR_STATE_RESP: 'SUO_DOOR_STATE',
};
