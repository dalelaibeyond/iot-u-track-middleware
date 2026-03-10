/**
 * V6800 Parser
 *
 * Parser for V6800 JSON protocol messages
 * Implementation - Parse JSON and transform to SIF format
 */

import { IMessageParser, RawMQTTMessage, ParserError } from './parser.interface';
import {
  SIFMessage,
  V6800DevModInfoSIF,
  V6800ModChngEventSIF,
  V6800HeartbeatSIF,
  V6800RfidEventSIF,
  V6800RfidSnapshotSIF,
  V6800TempHumSIF,
  V6800QueryTempHumRespSIF,
  V6800DoorStateEventSIF,
  V6800QueryDoorStateRespSIF,
  V6800SetColorRespSIF,
  V6800QueryColorRespSIF,
  V6800ClearAlarmRespSIF,
} from '../../types/index';
import { extractDeviceId } from './parser.interface';

/**
 * Mapping from V6800 msg_type to SIF messageType
 */
const MSG_TYPE_MAPPING: Record<string, string> = {
  // Event messages (Device → Middleware)
  devies_init_req: 'DEV_MOD_INFO',
  devices_changed_req: 'MOD_CHNG_EVENT',
  heart_beat_req: 'HEARTBEAT',
  u_state_changed_notify_req: 'RFID_EVENT',
  u_state_resp: 'RFID_SNAPSHOT',
  temper_humidity_exception_notify_req: 'TEMP_HUM',
  temper_humidity_exception_nofity_req: 'TEMP_HUM', // Typo in device firmware
  temper_humidity_resp: 'QUERY_TEMP_HUM_RESP',
  door_state_changed_notify_req: 'DOOR_STATE_EVENT',
  door_state_resp: 'QUERY_DOOR_STATE_RESP',
  set_module_property_result_req: 'SET_COLOR_RESP',
  u_color: 'QUERY_COLOR_RESP',
  clear_u_warning: 'CLEAR_ALARM_RESP',

  // Command messages (Middleware → Device) - typically not parsed, but listed for completeness
  get_devies_init_req: 'QUERY_DEV_MOD_INFO',
  u_state_req: 'QUERY_RFID_SNAPSHOT',
  door_state_req: 'QUERY_DOOR_STATE',
  temper_humidity_req: 'QUERY_TEMP_HUM',
  set_module_property_req: 'SET_COLOR',
  get_u_color: 'QUERY_COLOR',
};

/**
 * Convert snake_case to camelCase
 */
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
}

/**
 * Transform object keys from snake_case to camelCase
 */
function transformKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = toCamelCase(key);
    result[camelKey] = value;
  }
  return result;
}

/**
 * Transform module data from raw format to SIF format
 */
function transformModuleData(rawModule: Record<string, unknown>): {
  moduleIndex: number;
  moduleId: string;
  fwVer: string;
  uTotal: number;
} {
  return {
    moduleIndex: Number(rawModule.module_index) || 0,
    moduleId: String(rawModule.module_sn || ''),
    fwVer: String(rawModule.module_sw_version || ''),
    uTotal: Number(rawModule.module_u_num) || 0,
  };
}

export class V6800Parser implements IMessageParser {
  readonly name = 'V6800Parser';

  supports(deviceType: string): boolean {
    return deviceType === 'V6800';
  }

  async parse(rawMessage: RawMQTTMessage): Promise<SIFMessage> {
    try {
      // Extract device ID from topic
      const deviceId = extractDeviceId(rawMessage.topic);
      if (!deviceId) {
        throw new ParserError('Cannot extract device ID from topic', undefined, {
          topic: rawMessage.topic,
        });
      }

      // Parse JSON payload
      let rawData: Record<string, unknown>;
      try {
        const jsonStr = rawMessage.payload.toString('utf-8');
        rawData = JSON.parse(jsonStr) as Record<string, unknown>;
      } catch (error) {
        throw new ParserError(
          'Failed to parse JSON payload',
          error instanceof Error ? error : undefined,
          { topic: rawMessage.topic }
        );
      }

      // Validate required fields
      if (!rawData.msg_type) {
        throw new ParserError('Missing required field: msg_type', undefined, {
          topic: rawMessage.topic,
          rawData,
        });
      }

      // Map msg_type to messageType
      const rawMsgType = String(rawData.msg_type);
      const messageType = MSG_TYPE_MAPPING[rawMsgType];
      if (!messageType) {
        throw new ParserError(`Unknown msg_type: ${rawMsgType}`, undefined, {
          topic: rawMessage.topic,
          msg_type: rawMsgType,
        });
      }

      // Extract message ID
      const messageId = String(rawData.uuid_number || '');
      if (!messageId) {
        throw new ParserError('Missing required field: uuid_number', undefined, {
          topic: rawMessage.topic,
          rawData,
        });
      }

      // Build base SIF message
      const baseMessage: SIFMessage = {
        meta: {
          topic: rawMessage.topic,
          rawType: rawMsgType,
        },
        deviceType: 'V6800',
        deviceId,
        messageType: messageType as V6800DevModInfoSIF['messageType'],
        messageId,
      };

      // Handle specific message types
      switch (messageType) {
        case 'DEV_MOD_INFO':
          return this.parseDevModInfo(baseMessage, rawData);

        case 'MOD_CHNG_EVENT':
          return this.parseModChngEvent(baseMessage, rawData);

        case 'HEARTBEAT':
          return this.parseHeartbeat(baseMessage, rawData);

        case 'RFID_EVENT':
          return this.parseRfidEvent(baseMessage, rawData);

        case 'RFID_SNAPSHOT':
          return this.parseRfidSnapshot(baseMessage, rawData);

        case 'TEMP_HUM':
          return this.parseTempHum(baseMessage, rawData);

        case 'QUERY_TEMP_HUM_RESP':
          return this.parseQueryTempHumResp(baseMessage, rawData);

        case 'DOOR_STATE_EVENT':
          return this.parseDoorStateEvent(baseMessage, rawData);

        case 'QUERY_DOOR_STATE_RESP':
          return this.parseQueryDoorStateResp(baseMessage, rawData);

        case 'SET_COLOR_RESP':
          return this.parseSetColorResp(baseMessage, rawData);

        case 'QUERY_COLOR_RESP':
          return this.parseQueryColorResp(baseMessage, rawData);

        case 'CLEAR_ALARM_RESP':
          return this.parseClearAlarmResp(baseMessage, rawData);

        default:
          // For unimplemented message types, return base message
          return baseMessage;
      }
    } catch (error) {
      if (error instanceof ParserError) {
        throw error;
      }
      throw new ParserError(
        'Unexpected error parsing V6800 message',
        error instanceof Error ? error : undefined,
        { topic: rawMessage.topic }
      );
    }
  }

  /**
   * Parse DEV_MOD_INFO messages
   */
  private parseDevModInfo(
    baseMessage: SIFMessage,
    rawData: Record<string, unknown>
  ): V6800DevModInfoSIF {
    const rawModules = Array.isArray(rawData.data) ? rawData.data : [];
    const transformedModules = rawModules.map(module =>
      transformModuleData(module as Record<string, unknown>)
    );

    return {
      ...baseMessage,
      messageType: 'DEV_MOD_INFO' as const,
      ip: String(rawData.gateway_ip || ''),
      mac: String(rawData.gateway_mac || ''),
      data: transformedModules,
    };
  }

  /**
   * Parse MOD_CHNG_EVENT messages
   */
  private parseModChngEvent(
    baseMessage: SIFMessage,
    rawData: Record<string, unknown>
  ): V6800ModChngEventSIF {
    const rawModules = Array.isArray(rawData.data) ? rawData.data : [];
    const transformedModules = rawModules.map(module =>
      transformModuleData(module as Record<string, unknown>)
    );

    return {
      ...baseMessage,
      messageType: 'MOD_CHNG_EVENT' as const,
      data: transformedModules,
    };
  }

  /**
   * Parse HEARTBEAT messages
   */
  private parseHeartbeat(
    baseMessage: SIFMessage,
    rawData: Record<string, unknown>
  ): V6800HeartbeatSIF {
    const rawModules = Array.isArray(rawData.data) ? rawData.data : [];
    const transformedModules = rawModules.map((module: Record<string, unknown>) => ({
      moduleIndex: Number(module.module_index) || 0,
      moduleId: String(module.module_sn || ''),
      uTotal: Number(module.module_u_num) || 0,
    }));

    return {
      ...baseMessage,
      messageType: 'HEARTBEAT' as const,
      meta: {
        ...baseMessage.meta,
        busVoltage: String(rawData.bus_V || ''),
        busCurrent: String(rawData.bus_I || ''),
        mainPower: Number(rawData.main_power) || 0,
        backupPower: Number(rawData.backup_power) || 0,
      },
      data: transformedModules,
    };
  }

  /**
   * Parse RFID_EVENT messages
   */
  private parseRfidEvent(
    baseMessage: SIFMessage,
    rawData: Record<string, unknown>
  ): V6800RfidEventSIF {
    const rawUData = Array.isArray(rawData.data) ? rawData.data : [];
    const transformedData = rawUData.map((item: Record<string, unknown>) => {
      const uData = Array.isArray(item.u_data) ? item.u_data : [];
      return {
        moduleIndex: Number(item.host_gateway_port_index) || 0,
        moduleId: String(item.extend_module_sn || ''),
        data: uData.map((sensor: Record<string, unknown>) => ({
          sensorIndex: Number(sensor.u_index) || 0,
          action: sensor.new_state === 1 ? ('ATTACHED' as const) : ('DETACHED' as const),
          tagId: String(sensor.tag_code || ''),
          isAlarm: sensor.warning === 1,
        })),
      };
    });

    return {
      ...baseMessage,
      messageType: 'RFID_EVENT' as const,
      data: transformedData,
    };
  }

  /**
   * Parse RFID_SNAPSHOT messages
   */
  private parseRfidSnapshot(
    baseMessage: SIFMessage,
    rawData: Record<string, unknown>
  ): V6800RfidSnapshotSIF {
    const rawUData = Array.isArray(rawData.data) ? rawData.data : [];
    const transformedData = rawUData.map((item: Record<string, unknown>) => {
      const uData = Array.isArray(item.u_data) ? item.u_data : [];
      return {
        moduleIndex: Number(item.host_gateway_port_index) || 0,
        moduleId: String(item.extend_module_sn || ''),
        data: uData
          .filter((sensor: Record<string, unknown>) => sensor.u_state === 1)
          .map((sensor: Record<string, unknown>) => ({
            sensorIndex: Number(sensor.u_index) || 0,
            tagId: sensor.tag_code ? String(sensor.tag_code) : null,
            isAlarm: sensor.warning === 1,
          })),
      };
    });

    return {
      ...baseMessage,
      messageType: 'RFID_SNAPSHOT' as const,
      data: transformedData,
    };
  }

  /**
   * Parse TEMP_HUM messages
   */
  private parseTempHum(baseMessage: SIFMessage, rawData: Record<string, unknown>): V6800TempHumSIF {
    const rawThData = Array.isArray(rawData.data) ? rawData.data : [];
    const transformedData = rawThData.map((item: Record<string, unknown>) => {
      const thData = Array.isArray(item.th_data) ? item.th_data : [];
      return {
        moduleIndex: Number(item.host_gateway_port_index) || 0,
        moduleId: String(item.extend_module_sn || ''),
        data: thData.map((sensor: Record<string, unknown>) => ({
          sensorIndex: Number(sensor.temper_position) || 0,
          temp: sensor.temper_swot !== undefined ? Number(sensor.temper_swot) : null,
          hum: sensor.hygrometer_swot !== undefined ? Number(sensor.hygrometer_swot) : null,
        })),
      };
    });

    return {
      ...baseMessage,
      messageType: 'TEMP_HUM' as const,
      data: transformedData,
    };
  }

  /**
   * Parse QUERY_TEMP_HUM_RESP messages
   */
  private parseQueryTempHumResp(
    baseMessage: SIFMessage,
    rawData: Record<string, unknown>
  ): V6800QueryTempHumRespSIF {
    const rawThData = Array.isArray(rawData.data) ? rawData.data : [];
    const transformedData = rawThData.map((item: Record<string, unknown>) => {
      const thData = Array.isArray(item.th_data) ? item.th_data : [];
      return {
        moduleIndex: Number(item.host_gateway_port_index) || 0,
        moduleId: String(item.extend_module_sn || ''),
        data: thData.map((sensor: Record<string, unknown>) => ({
          sensorIndex: Number(sensor.temper_position) || 0,
          temp: sensor.temper_swot !== undefined ? Number(sensor.temper_swot) : null,
          hum: sensor.hygrometer_swot !== undefined ? Number(sensor.hygrometer_swot) : null,
        })),
      };
    });

    return {
      ...baseMessage,
      messageType: 'QUERY_TEMP_HUM_RESP' as const,
      data: transformedData,
    };
  }

  /**
   * Parse DOOR_STATE_EVENT messages
   */
  private parseDoorStateEvent(
    baseMessage: SIFMessage,
    rawData: Record<string, unknown>
  ): V6800DoorStateEventSIF {
    const rawDataArray = Array.isArray(rawData.data) ? rawData.data : [];
    const transformedData = rawDataArray.map((item: Record<string, unknown>) => ({
      moduleId: String(item.extend_module_sn || ''),
      moduleIndex: Number(item.host_gateway_port_index) || 0,
      door1State: Number(item.new_state ?? item.new_state1) || 0,
      door2State: item.new_state2 !== undefined ? Number(item.new_state2) : null,
    }));

    return {
      ...baseMessage,
      messageType: 'DOOR_STATE_EVENT' as const,
      data: transformedData,
    };
  }

  /**
   * Parse QUERY_DOOR_STATE_RESP messages
   */
  private parseQueryDoorStateResp(
    baseMessage: SIFMessage,
    rawData: Record<string, unknown>
  ): V6800QueryDoorStateRespSIF {
    const dataArray = [
      {
        moduleIndex: Number(rawData.gateway_port_index) || 0,
        door1State: Number(rawData.new_state ?? rawData.new_state1) || 0,
        door2State: rawData.new_state2 !== undefined ? Number(rawData.new_state2) : null,
      },
    ];

    return {
      ...baseMessage,
      messageType: 'QUERY_DOOR_STATE_RESP' as const,
      data: dataArray,
    };
  }

  /**
   * Parse SET_COLOR_RESP messages
   */
  private parseSetColorResp(
    baseMessage: SIFMessage,
    rawData: Record<string, unknown>
  ): V6800SetColorRespSIF {
    const rawDataArray = Array.isArray(rawData.data) ? rawData.data : [];
    const transformedData = rawDataArray.map((item: Record<string, unknown>) => ({
      moduleIndex: Number(item.host_gateway_port_index) || 0,
      moduleId: String(item.extend_module_sn || ''),
      result: item.set_property_result === 0 ? ('Success' as const) : ('Failure' as const),
    }));

    // Determine overall result (Success if all modules succeed)
    const overallResult = transformedData.every(d => d.result === 'Success')
      ? ('Success' as const)
      : ('Failure' as const);

    return {
      ...baseMessage,
      messageType: 'SET_COLOR_RESP' as const,
      result: overallResult,
      data: transformedData,
    };
  }

  /**
   * Parse QUERY_COLOR_RESP messages
   */
  private parseQueryColorResp(
    baseMessage: SIFMessage,
    rawData: Record<string, unknown>
  ): V6800QueryColorRespSIF {
    const rawDataArray = Array.isArray(rawData.data) ? rawData.data : [];
    const transformedData = rawDataArray.map((item: Record<string, unknown>) => {
      const colorData = Array.isArray(item.color_data) ? item.color_data : [];
      return {
        moduleIndex: Number(item.index) || 0,
        moduleId: String(item.module_id || ''),
        uTotal: Number(item.u_num) || 0,
        data: colorData.map((color: Record<string, unknown>) => ({
          sensorIndex: Number(color.index) || 0,
          colorName: String(color.color || ''),
          colorCode: Number(color.code) || 0,
        })),
      };
    });

    // Determine overall result based on code field
    const code = Number(rawData.code) || 0;
    const overallResult = code === 0 ? ('Success' as const) : ('Failure' as const);

    return {
      ...baseMessage,
      messageType: 'QUERY_COLOR_RESP' as const,
      result: overallResult,
      data: transformedData,
    };
  }

  /**
   * Parse CLEAR_ALARM_RESP messages
   */
  private parseClearAlarmResp(
    baseMessage: SIFMessage,
    rawData: Record<string, unknown>
  ): V6800ClearAlarmRespSIF {
    const rawDataArray = Array.isArray(rawData.data) ? rawData.data : [];
    const transformedData = rawDataArray.map((item: Record<string, unknown>) => ({
      moduleIndex: Number(item.index) || 0,
      moduleId: String(item.module_id || ''),
      uTotal: Number(item.u_num) || 0,
      result: item.ctr_flag === true ? ('Success' as const) : ('Failure' as const),
    }));

    // Determine overall result based on code field
    const code = Number(rawData.code) || 0;
    const overallResult = code === 0 ? ('Success' as const) : ('Failure' as const);

    return {
      ...baseMessage,
      messageType: 'CLEAR_ALARM_RESP' as const,
      result: overallResult,
      data: transformedData,
    };
  }
}
