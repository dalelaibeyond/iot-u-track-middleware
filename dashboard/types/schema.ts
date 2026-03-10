export interface RFIDTag {
  sensorIndex: number;
  tagId: string;
  isAlarm: boolean;
}

export interface TempHum {
  sensorIndex: number;
  temp: number;
  hum: number;
}

export interface NoiseLevel {
  sensorIndex: number;
  noise: number;
}

export interface RackState {
  deviceId: string;
  moduleIndex: number;

  // Module Info
  moduleId?: string;
  uTotal?: number;

  // Status
  isOnline: boolean;
  lastSeenHb?: string;

  // Sensor Data
  rfidSnapshot?: RFIDTag[];
  tempHum?: TempHum[];
  noiseLevel?: NoiseLevel[];

  // Doors (0=Closed, 1=Open)
  doorState?: number | null;
  door1State?: number | null;
  door2State?: number | null;
}

export interface ModuleMetadata {
  moduleIndex: number;
  moduleId: string;
  uTotal: number;
  fwVer?: string | null;
}

export interface DeviceMetadata {
  deviceId: string;
  deviceType: string;
  ip: string | null;
  mac?: string | null;
  fwVer: string | null;
  mask?: string | null;
  gwIp?: string | null;
  isOnline: boolean;
  activeModules: ModuleMetadata[];
}

// Backend SUO message types (from middleware WebSocket)
export type SUOType =
  | 'SUO_DEV_MOD'
  | 'SUO_HEARTBEAT'
  | 'SUO_TEMP_HUM'
  | 'SUO_RFID_SNAPSHOT'
  | 'SUO_RFID_EVENT'
  | 'SUO_DOOR_STATE'
  | 'SUO_NOISE_LEVEL'
  | 'SUO_COMMAND_RESULT';

/**
 * Base SUO message fields (common to all SUO types)
 */
interface BaseSUOUpdate {
  suoType: SUOType;
  deviceId: string;
  deviceType: 'V5008' | 'V6800';
  serverTimestamp: string;
  deviceTimestamp: string | null;
  messageId: string;
}

/**
 * SUO_DEV_MOD - Device and module metadata (FLAT STRUCTURE)
 * Note: No moduleIndex/moduleId at root level for this type
 */
export interface SUODevModUpdate extends BaseSUOUpdate {
  suoType: 'SUO_DEV_MOD';
  // Device-level fields (flat structure)
  ip: string | null;
  mask: string | null;
  gwIp: string | null;
  mac: string | null;
  model: string | null;
  fwVer: string | null;
  // Modules array at root level (flat structure)
  modules: Array<{
    moduleIndex: number;
    moduleId: string;
    fwVer: string;
    uTotal: number;
  }>;
}

/**
 * SUO_HEARTBEAT - Device heartbeat status (FLAT STRUCTURE)
 * Note: No moduleIndex/moduleId at root level for this type
 */
export interface SUOHeartbeatUpdate extends BaseSUOUpdate {
  suoType: 'SUO_HEARTBEAT';
  meta?: {
    busVoltage: string | null;
    busCurrent: string | null;
    mainPower: number | null;
    backupPower: number | null;
  };
  // Modules array at root level (flat structure)
  modules: Array<{
    moduleIndex: number;
    moduleId: string;
    uTotal: number;
  }>;
}

/**
 * SUO single-module message types (have moduleIndex/moduleId at root)
 * These types extend SUOMessage base and have nested data object
 */
export interface SUOSingleModuleUpdate extends BaseSUOUpdate {
  suoType:
    | 'SUO_RFID_SNAPSHOT'
    | 'SUO_RFID_EVENT'
    | 'SUO_TEMP_HUM'
    | 'SUO_NOISE_LEVEL'
    | 'SUO_DOOR_STATE'
    | 'SUO_COMMAND_RESULT';
  // moduleIndex is required for single-module messages
  moduleIndex: number;
  moduleId: string | null;
  // Nested data object for these types
  data: {
    sensors?: Array<{
      sensorIndex: number;
      tagId?: string | null;
      isAlarm?: boolean;
      temp?: number | null;
      hum?: number | null;
      noise?: number | null;
    }>;
    // Door state fields
    doorState?: number;
    door1State?: number;
    door2State?: number | null;
    // Command result fields
    commandType?: string;
    result?: 'Success' | 'Failure';
  };
}

/**
 * Union type for all SUO updates from middleware
 */
export type AnySUOUpdate = SUODevModUpdate | SUOHeartbeatUpdate | SUOSingleModuleUpdate;

/**
 * Legacy SUOUpdate interface for backward compatibility
 * @deprecated Use AnySUOUpdate with type guards instead
 */
export interface SUOUpdate {
  suoType?: SUOType;
  deviceId: string;
  deviceType?: string;
  serverTimestamp?: string;
  deviceTimestamp?: string | null;
  messageId?: string;
  moduleIndex?: number;
  moduleId?: string | null;
  uTotal?: number;
  // Device-level fields
  ip?: string | null;
  mac?: string | null;
  fwVer?: string | null;
  mask?: string | null;
  gwIp?: string | null;
  model?: string | null;
  // Flat structure fields
  modules?: Array<{
    moduleIndex: number;
    moduleId: string;
    fwVer?: string;
    uTotal: number;
  }>;
  meta?: {
    busVoltage: string | null;
    busCurrent: string | null;
    mainPower: number | null;
    backupPower: number | null;
  };
  // Nested data structure (for single-module types)
  data?: any;
  payload?: any;
  doorState?: number | null;
  door1State?: number | null;
  door2State?: number | null;
  rfidSnapshot?: Array<{
    sensorIndex: number;
    tagId: string;
    isAlarm: boolean;
  }>;
  tempHum?: Array<{
    sensorIndex: number;
    temp: number;
    hum: number;
  }>;
  noiseLevel?: Array<{
    sensorIndex: number;
    noise: number;
  }>;
  sensors?: Array<any>;
}

/**
 * Type guards for SUO message types
 */
export function isSUODevModUpdate(suo: AnySUOUpdate): suo is SUODevModUpdate {
  return suo.suoType === 'SUO_DEV_MOD';
}

export function isSUOHeartbeatUpdate(suo: AnySUOUpdate): suo is SUOHeartbeatUpdate {
  return suo.suoType === 'SUO_HEARTBEAT';
}

export function isSUOSingleModuleUpdate(suo: AnySUOUpdate): suo is SUOSingleModuleUpdate {
  return [
    'SUO_RFID_SNAPSHOT',
    'SUO_RFID_EVENT',
    'SUO_TEMP_HUM',
    'SUO_NOISE_LEVEL',
    'SUO_DOOR_STATE',
    'SUO_COMMAND_RESULT',
  ].includes(suo.suoType);
}

export interface CommandRequest {
  deviceId: string;
  deviceType: string;
  command: string;
  moduleIndex?: number;
  uIndex?: number;
  payload?: any;
}
