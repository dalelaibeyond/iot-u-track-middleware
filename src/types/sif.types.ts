/**
 * SIF (Standard Intermediate Format) Type Definitions
 * 
 * Based on:
 * - V5008_Spec.md (Binary protocol)
 * - v6800_spec.md (JSON protocol)
 * 
 * SIF is the normalized format after parsing RAW device messages.
 * All device-specific formats (V5008 binary, V6800 JSON) are converted to SIF.
 */

/**
 * Message metadata included in all SIF messages
 */
export interface MessageMetadata {
  topic: string;
  rawHex?: string;      // For V5008 binary messages
  rawType?: string;     // For V6800 JSON msg_type field
}

/**
 * Base SIF Message interface
 * All SIF messages extend this interface
 */
export interface SIFMessage {
  meta: MessageMetadata;
  deviceType: 'V5008' | 'V6800';
  deviceId: string;
  messageType: SIFMessageType;
  messageId: string;
  timestamp?: string;   // ISO8601 format
}

/**
 * Union type of all possible SIF message types
 */
export type SIFMessageType = 
  // V5008 Message Types
  | 'HEARTBEAT'
  | 'RFID_SNAPSHOT'
  | 'TEMP_HUM'
  | 'NOISE_LEVEL'
  | 'DOOR_STATE'
  | 'DEVICE_INFO'
  | 'MODULE_INFO'
  | 'QUERY_COLOR_RESP'
  | 'SET_COLOR_RESP'
  | 'CLEAR_ALARM_RESP'
  | 'QUERY_DEVICE_INFO'
  | 'QUERY_MODULE_INFO'
  | 'QUERY_RFID_SNAPSHOT'
  | 'QUERY_DOOR_STATE'
  | 'QUERY_TEMP_HUM'
  | 'SET_COLOR'
  | 'QUERY_COLOR'
  | 'CLEAR_ALARM'
  // V6800 Message Types
  | 'DEV_MOD_INFO'
  | 'MOD_CHNG_EVENT'
  | 'RFID_EVENT'
  | 'QUERY_TEMP_HUM_RESP'
  | 'DOOR_STATE_EVENT'
  | 'QUERY_DOOR_STATE_RESP';

// ============================================================================
// V5008 SIF Message Types (Binary Protocol)
// ============================================================================

/**
 * V5008 HEARTBEAT message
 * Topic: V5008Upload/{deviceId}/OpeAck
 * Header: 0xCC or 0xCB
 */
export interface V5008HeartbeatSIF extends SIFMessage {
  messageType: 'HEARTBEAT';
  data: Array<{
    moduleIndex: number;
    moduleId: string;
    uTotal: number;
  }>;
}

/**
 * V5008 RFID_SNAPSHOT message
 * Topic: V5008Upload/{deviceId}/LabelState
 * Header: 0xBB
 */
export interface V5008RfidSnapshotSIF extends SIFMessage {
  messageType: 'RFID_SNAPSHOT';
  moduleIndex: number;
  moduleId: string;
  uTotal: number;
  data: Array<{
    sensorIndex: number;
    tagId: string | null;
    isAlarm: boolean;
  }>;
}

/**
 * V5008 TEMP_HUM message
 * Topic: V5008Upload/{deviceId}/TemHum
 * No header - identified by topic
 */
export interface V5008TempHumSIF extends SIFMessage {
  messageType: 'TEMP_HUM';
  moduleIndex: number;
  moduleId: string;
  data: Array<{
    sensorIndex: number;
    temp: number | null;
    hum: number | null;
  }>;
}

/**
 * V5008 NOISE_LEVEL message
 * Topic: V5008Upload/{deviceId}/Noise
 * No header - identified by topic
 */
export interface V5008NoiseLevelSIF extends SIFMessage {
  messageType: 'NOISE_LEVEL';
  moduleIndex: number;
  moduleId: string;
  data: Array<{
    sensorIndex: number;
    noise: number | null;
  }>;
}

/**
 * V5008 DOOR_STATE message
 * Topic: V5008Upload/{deviceId}/OpeAck
 * Header: 0xBA
 */
export interface V5008DoorStateSIF extends SIFMessage {
  messageType: 'DOOR_STATE';
  moduleIndex: number;
  moduleId: string;
  door1State: number;      // 0=closed, 1=open
  door2State: number | null; // null for single door
}

/**
 * V5008 DEVICE_INFO message
 * Topic: V5008Upload/{deviceId}/OpeAck
 * Header: 0xEF01
 */
export interface V5008DeviceInfoSIF extends SIFMessage {
  messageType: 'DEVICE_INFO';
  fwVer: string;
  ip: string;
  mask: string;
  gwIp: string;
  mac: string;
  model: string;
}

/**
 * V5008 MODULE_INFO message
 * Topic: V5008Upload/{deviceId}/OpeAck
 * Header: 0xEF02
 */
export interface V5008ModuleInfoSIF extends SIFMessage {
  messageType: 'MODULE_INFO';
  data: Array<{
    moduleIndex: number;
    fwVer: string;
  }>;
}

/**
 * V5008 Command Response base interface
 * Topic: V5008Upload/{deviceId}/OpeAck
 * Header: 0xAA
 */
export interface V5008CommandResponseSIF extends SIFMessage {
  deviceId: string;
  result: 'Success' | 'Failure';
  moduleIndex: number;
  originalReq: string;     // Hex string of original command
}

/**
 * V5008 QUERY_COLOR_RESP message
 */
export interface V5008QueryColorRespSIF extends V5008CommandResponseSIF {
  messageType: 'QUERY_COLOR_RESP';
  data: number[];    // Flat array of color codes
}

/**
 * V5008 SET_COLOR_RESP message
 */
export interface V5008SetColorRespSIF extends V5008CommandResponseSIF {
  messageType: 'SET_COLOR_RESP';
}

/**
 * V5008 CLEAR_ALARM_RESP message
 */
export interface V5008ClearAlarmRespSIF extends V5008CommandResponseSIF {
  messageType: 'CLEAR_ALARM_RESP';
}

// ============================================================================
// V6800 SIF Message Types (JSON Protocol)
// ============================================================================

/**
 * V6800 DEV_MOD_INFO message
 * Topic: V6800Upload/{deviceId}/Init
 */
export interface V6800DevModInfoSIF extends SIFMessage {
  messageType: 'DEV_MOD_INFO';
  ip: string;
  mac: string;
  data: Array<{
    moduleIndex: number;
    moduleId: string;
    fwVer: string;
    uTotal: number;
  }>;
}

/**
 * V6800 MOD_CHNG_EVENT message
 * Topic: V6800Upload/{deviceId}/DeviceChange
 */
export interface V6800ModChngEventSIF extends SIFMessage {
  messageType: 'MOD_CHNG_EVENT';
  data: Array<{
    moduleIndex: number;
    moduleId: string;
    fwVer: string;
    uTotal: number;
  }>;
}

/**
 * V6800 HEARTBEAT message
 * Topic: V6800Upload/{deviceId}/HeartBeat
 */
export interface V6800HeartbeatSIF extends SIFMessage {
  messageType: 'HEARTBEAT';
  meta: MessageMetadata & {
    busVoltage: string;
    busCurrent: string;
    mainPower: number;
    backupPower: number;
  };
  data: Array<{
    moduleIndex: number;
    moduleId: string;
    uTotal: number;
  }>;
}

/**
 * V6800 RFID_EVENT message
 * Topic: V6800Upload/{deviceId}/LabelState
 */
export interface V6800RfidEventSIF extends SIFMessage {
  messageType: 'RFID_EVENT';
  data: Array<{
    moduleIndex: number;
    moduleId: string;
    data: Array<{
      sensorIndex: number;
      action: 'ATTACHED' | 'DETACHED';
      tagId: string;
      isAlarm: boolean;
    }>;
  }>;
}

/**
 * V6800 RFID_SNAPSHOT message
 * Topic: V6800Upload/{deviceId}/LabelState
 */
export interface V6800RfidSnapshotSIF extends SIFMessage {
  messageType: 'RFID_SNAPSHOT';
  data: Array<{
    moduleIndex: number;
    moduleId: string;
    data: Array<{
      sensorIndex: number;
      tagId: string | null;
      isAlarm: boolean;
    }>;
  }>;
}

/**
 * V6800 TEMP_HUM message
 * Topic: V6800Upload/{deviceId}/TemHum
 */
export interface V6800TempHumSIF extends SIFMessage {
  messageType: 'TEMP_HUM';
  data: Array<{
    moduleIndex: number;
    moduleId: string;
    data: Array<{
      sensorIndex: number;
      temp: number | null;
      hum: number | null;
    }>;
  }>;
}

/**
 * V6800 QUERY_TEMP_HUM_RESP message
 * Topic: V6800Upload/{deviceId}/TemHum
 */
export interface V6800QueryTempHumRespSIF extends SIFMessage {
  messageType: 'QUERY_TEMP_HUM_RESP';
  data: Array<{
    moduleIndex: number;
    moduleId: string;
    data: Array<{
      sensorIndex: number;
      temp: number | null;
      hum: number | null;
    }>;
  }>;
}

/**
 * V6800 DOOR_STATE_EVENT message
 * Topic: V6800Upload/{deviceId}/Door
 */
export interface V6800DoorStateEventSIF extends SIFMessage {
  messageType: 'DOOR_STATE_EVENT';
  data: Array<{
    moduleId: string;
    moduleIndex: number;
    door1State: number;
    door2State: number | null;
  }>;
}

/**
 * V6800 QUERY_DOOR_STATE_RESP message
 * Topic: V6800Upload/{deviceId}/Door
 */
export interface V6800QueryDoorStateRespSIF extends SIFMessage {
  messageType: 'QUERY_DOOR_STATE_RESP';
  data: Array<{
    moduleIndex: number;
    door1State: number;
    door2State: number | null;
  }>;
}

/**
 * V6800 Command Response base interface
 * Topic: V6800Upload/{deviceId}/OpeAck
 */
export interface V6800CommandResponseSIF extends SIFMessage {
  result: 'Success' | 'Failure';
}

/**
 * V6800 SET_COLOR_RESP message
 */
export interface V6800SetColorRespSIF extends V6800CommandResponseSIF {
  messageType: 'SET_COLOR_RESP';
  data: Array<{
    moduleIndex: number;
    moduleId: string;
    result: 'Success' | 'Failure';
  }>;
}

/**
 * V6800 QUERY_COLOR_RESP message
 */
export interface V6800QueryColorRespSIF extends V6800CommandResponseSIF {
  messageType: 'QUERY_COLOR_RESP';
  data: Array<{
    moduleIndex: number;
    moduleId: string;
    uTotal: number;
    data: Array<{
      sensorIndex: number;
      colorName: string;
      colorCode: number;
    }>;
  }>;
}

/**
 * V6800 CLEAR_ALARM_RESP message
 */
export interface V6800ClearAlarmRespSIF extends V6800CommandResponseSIF {
  messageType: 'CLEAR_ALARM_RESP';
  data: Array<{
    moduleIndex: number;
    moduleId: string;
    uTotal: number;
    result: 'Success' | 'Failure';
  }>;
}

// ============================================================================
// Union Types for Type Guards
// ============================================================================

/** All V5008 SIF message types */
export type V5008SIFMessage =
  | V5008HeartbeatSIF
  | V5008RfidSnapshotSIF
  | V5008TempHumSIF
  | V5008NoiseLevelSIF
  | V5008DoorStateSIF
  | V5008DeviceInfoSIF
  | V5008ModuleInfoSIF
  | V5008QueryColorRespSIF
  | V5008SetColorRespSIF
  | V5008ClearAlarmRespSIF;

/** All V6800 SIF message types */
export type V6800SIFMessage =
  | V6800DevModInfoSIF
  | V6800ModChngEventSIF
  | V6800HeartbeatSIF
  | V6800RfidEventSIF
  | V6800RfidSnapshotSIF
  | V6800TempHumSIF
  | V6800QueryTempHumRespSIF
  | V6800DoorStateEventSIF
  | V6800QueryDoorStateRespSIF
  | V6800SetColorRespSIF
  | V6800QueryColorRespSIF
  | V6800ClearAlarmRespSIF;

/** Union of all SIF message types */
export type AnySIFMessage = V5008SIFMessage | V6800SIFMessage;
