/**
 * V6800 Normalizer
 *
 * Normalizes V6800 SIF messages to SUO format
 * Based on SUO_UOS_DB_Spec.md
 */

import { BaseNormalizer, NormalizerError } from './normalizer.interface';
import {
  SIFMessage,
  V6800DevModInfoSIF,
  V6800ModChngEventSIF,
  V6800HeartbeatSIF,
  V6800RfidEventSIF,
  V6800RfidSnapshotSIF,
  V6800TempHumSIF,
  V6800DoorStateEventSIF,
  V6800QueryDoorStateRespSIF,
  V6800SetColorRespSIF,
  V6800QueryColorRespSIF,
  V6800ClearAlarmRespSIF,
} from '../../types/sif.types';
import {
  AnySUOMessage,
  SUODevMod,
  SUOHeartbeat,
  SUORfidSnapshot,
  SUORfidEvent,
  SUOTempHum,
  SUODoorState,
  SUOCommandResult,
} from '../../types/suo.types';

export class V6800Normalizer extends BaseNormalizer {
  readonly name = 'V6800Normalizer';

  supports(sifMessage: SIFMessage): boolean {
    return sifMessage.deviceType === 'V6800';
  }

  async normalize(sifMessage: SIFMessage): Promise<AnySUOMessage | AnySUOMessage[]> {
    try {
      switch (sifMessage.messageType) {
        case 'DEV_MOD_INFO':
          return this.normalizeDevModInfo(sifMessage as V6800DevModInfoSIF);
        case 'MOD_CHNG_EVENT':
          return this.normalizeModChngEvent(sifMessage as V6800ModChngEventSIF);
        case 'HEARTBEAT':
          return this.normalizeHeartbeat(sifMessage as V6800HeartbeatSIF);
        case 'RFID_EVENT':
          return this.normalizeRfidEvent(sifMessage as V6800RfidEventSIF);
        case 'RFID_SNAPSHOT':
          return this.normalizeRfidSnapshot(sifMessage as V6800RfidSnapshotSIF);
        case 'TEMP_HUM':
        case 'QUERY_TEMP_HUM_RESP':
          return this.normalizeTempHum(sifMessage as V6800TempHumSIF);
        case 'DOOR_STATE_EVENT':
          return this.normalizeDoorStateEvent(sifMessage as V6800DoorStateEventSIF);
        case 'QUERY_DOOR_STATE_RESP':
          return this.normalizeQueryDoorStateResp(sifMessage as V6800QueryDoorStateRespSIF);
        case 'SET_COLOR_RESP':
        case 'QUERY_COLOR_RESP':
        case 'CLEAR_ALARM_RESP':
          return this.normalizeCommandResponse(
            sifMessage as V6800SetColorRespSIF | V6800QueryColorRespSIF | V6800ClearAlarmRespSIF
          );
        default:
          throw new NormalizerError(
            `Unsupported V6800 message type: ${sifMessage.messageType}`,
            undefined,
            {
              messageType: sifMessage.messageType,
            }
          );
      }
    } catch (error) {
      if (error instanceof NormalizerError) {
        throw error;
      }
      throw new NormalizerError(
        'Unexpected error normalizing V6800 message',
        error instanceof Error ? error : undefined,
        { messageType: sifMessage.messageType }
      );
    }
  }

  /**
   * Normalize DEV_MOD_INFO to SUO_DEV_MOD
   */
  private normalizeDevModInfo(sif: V6800DevModInfoSIF): SUODevMod {
    const base = this.createBaseSUO(sif, 'SUO_DEV_MOD' as const, null, null);
    return {
      suoType: 'SUO_DEV_MOD',
      deviceId: base.deviceId,
      deviceType: base.deviceType,
      serverTimestamp: base.serverTimestamp,
      deviceTimestamp: base.deviceTimestamp,
      messageId: base.messageId,
      ip: sif.ip || null,
      mask: null,
      gwIp: null,
      mac: sif.mac || null,
      model: null,
      fwVer: null,
      modules: sif.data.map(module => ({
        moduleIndex: module.moduleIndex,
        moduleId: module.moduleId,
        fwVer: module.fwVer || '',
        uTotal: module.uTotal || 0,
      })),
    };
  }

  /**
   * Normalize MOD_CHNG_EVENT to SUO_DEV_MOD
   */
  private normalizeModChngEvent(sif: V6800ModChngEventSIF): SUODevMod {
    const base = this.createBaseSUO(sif, 'SUO_DEV_MOD' as const, null, null);
    return {
      suoType: 'SUO_DEV_MOD',
      deviceId: base.deviceId,
      deviceType: base.deviceType,
      serverTimestamp: base.serverTimestamp,
      deviceTimestamp: base.deviceTimestamp,
      messageId: base.messageId,
      ip: null,
      mask: null,
      gwIp: null,
      mac: null,
      model: null,
      fwVer: null,
      modules: sif.data.map(module => ({
        moduleIndex: module.moduleIndex,
        moduleId: module.moduleId,
        fwVer: module.fwVer || '',
        uTotal: module.uTotal || 0,
      })),
    };
  }

  /**
   * Normalize HEARTBEAT to SUO_HEARTBEAT
   */
  private normalizeHeartbeat(sif: V6800HeartbeatSIF): SUOHeartbeat {
    const base = this.createBaseSUO(sif, 'SUO_HEARTBEAT' as const, null, null);
    return {
      suoType: 'SUO_HEARTBEAT',
      deviceId: base.deviceId,
      deviceType: base.deviceType,
      serverTimestamp: base.serverTimestamp,
      deviceTimestamp: base.deviceTimestamp,
      messageId: base.messageId,
      meta: {
        busVoltage: sif.meta.busVoltage || null,
        busCurrent: sif.meta.busCurrent || null,
        mainPower: sif.meta.mainPower ?? null,
        backupPower: sif.meta.backupPower ?? null,
      },
      modules: sif.data.map(module => ({
        moduleIndex: module.moduleIndex,
        moduleId: module.moduleId,
        uTotal: module.uTotal,
      })),
    };
  }

  /**
   * Normalize RFID_EVENT to SUO_RFID_EVENT (flattened - one per module)
   */
  private normalizeRfidEvent(sif: V6800RfidEventSIF): SUORfidEvent[] {
    return sif.data.map(module => {
      const base = this.createBaseSUO(
        sif,
        'SUO_RFID_EVENT' as const,
        module.moduleIndex,
        module.moduleId
      );
      return {
        ...base,
        moduleIndex: module.moduleIndex,
        moduleId: module.moduleId,
        data: {
          events: module.data.map(sensor => ({
            sensorIndex: sensor.sensorIndex,
            action: sensor.action,
            tagId: sensor.tagId,
            isAlarm: sensor.isAlarm,
          })),
        },
      } as unknown as SUORfidEvent;
    });
  }

  /**
   * Normalize RFID_SNAPSHOT to SUO_RFID_SNAPSHOT (flattened - one per module)
   */
  private normalizeRfidSnapshot(sif: V6800RfidSnapshotSIF): SUORfidSnapshot[] {
    return sif.data.map(module => {
      const base = this.createBaseSUO(
        sif,
        'SUO_RFID_SNAPSHOT' as const,
        module.moduleIndex,
        module.moduleId
      );
      return {
        ...base,
        moduleIndex: module.moduleIndex,
        moduleId: module.moduleId,
        data: {
          sensors: module.data.map(sensor => ({
            sensorIndex: sensor.sensorIndex,
            tagId: sensor.tagId || null,
            isAlarm: sensor.isAlarm,
          })),
        },
      };
    });
  }

  /**
   * Normalize TEMP_HUM to SUO_TEMP_HUM (flattened - one per module)
   */
  private normalizeTempHum(sif: V6800TempHumSIF): SUOTempHum[] {
    return sif.data.map(module => {
      const base = this.createBaseSUO(
        sif,
        'SUO_TEMP_HUM' as const,
        module.moduleIndex,
        module.moduleId
      );
      return {
        ...base,
        moduleIndex: module.moduleIndex,
        moduleId: module.moduleId,
        data: {
          sensors: module.data.map(sensor => ({
            sensorIndex: sensor.sensorIndex,
            temp: sensor.temp ?? null,
            hum: sensor.hum ?? null,
          })),
        },
      };
    });
  }

  /**
   * Normalize DOOR_STATE_EVENT to SUO_DOOR_STATE (flattened - one per module)
   */
  private normalizeDoorStateEvent(sif: V6800DoorStateEventSIF): SUODoorState[] {
    return sif.data.map(module => {
      const base = this.createBaseSUO(
        sif,
        'SUO_DOOR_STATE' as const,
        module.moduleIndex,
        module.moduleId
      );
      return {
        ...base,
        moduleIndex: module.moduleIndex,
        moduleId: module.moduleId,
        door1State: module.door1State,
        door2State: module.door2State,
        data: {},
      };
    });
  }

  /**
   * Normalize QUERY_DOOR_STATE_RESP to SUO_DOOR_STATE (flattened - one per module)
   */
  private normalizeQueryDoorStateResp(sif: V6800QueryDoorStateRespSIF): SUODoorState[] {
    return sif.data.map(module => {
      const base = this.createBaseSUO(sif, 'SUO_DOOR_STATE' as const, module.moduleIndex, null);
      return {
        ...base,
        moduleIndex: module.moduleIndex,
        moduleId: '',
        door1State: module.door1State,
        door2State: module.door2State,
        data: {},
      };
    });
  }

  /**
   * Normalize command responses to SUO_COMMAND_RESULT
   */
  private normalizeCommandResponse(
    sif: V6800SetColorRespSIF | V6800QueryColorRespSIF | V6800ClearAlarmRespSIF
  ): SUOCommandResult {
    let commandType: string;
    let colorCodes: number[] | undefined = undefined;

    switch (sif.messageType) {
      case 'SET_COLOR_RESP':
        commandType = 'SET_COLOR';
        break;
      case 'QUERY_COLOR_RESP':
        commandType = 'QUERY_COLOR';
        // Extract color codes from first module's data if available
        if ('data' in sif && sif.data.length > 0 && 'data' in sif.data[0]) {
          const moduleData = sif.data[0].data;
          colorCodes = moduleData.map((sensor: { colorCode: number }) => sensor.colorCode);
        }
        break;
      case 'CLEAR_ALARM_RESP':
        commandType = 'CLEAR_ALARM';
        break;
      default:
        commandType = 'UNKNOWN';
    }

    // For flattened responses, use the first module's data
    const moduleIndex = sif.data.length > 0 ? sif.data[0].moduleIndex : 0;
    const moduleId = sif.data.length > 0 ? sif.data[0].moduleId : '';

    const base = this.createBaseSUO(sif, 'SUO_COMMAND_RESULT' as const, moduleIndex, moduleId);
    return {
      ...base,
      moduleIndex: moduleIndex,
      moduleId: moduleId,
      data: {
        commandType,
        result: sif.result,
        originalReq: null,
        colorCodes,
      },
    };
  }
}
