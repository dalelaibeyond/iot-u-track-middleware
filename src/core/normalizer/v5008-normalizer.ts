/**
 * V5008 Normalizer
 *
 * Normalizes V5008 SIF messages to SUO format
 * Based on SUO_UOS_DB_Spec.md
 */

import { BaseNormalizer, NormalizerError } from './normalizer.interface';
import {
  SIFMessage,
  V5008HeartbeatSIF,
  V5008RfidSnapshotSIF,
  V5008TempHumSIF,
  V5008NoiseLevelSIF,
  V5008DoorStateSIF,
  V5008DeviceInfoSIF,
  V5008ModuleInfoSIF,
  V5008QueryColorRespSIF,
  V5008SetColorRespSIF,
  V5008ClearAlarmRespSIF,
} from '../../types/sif.types';
import {
  AnySUOMessage,
  SUODevMod,
  SUOHeartbeat,
  SUORfidSnapshot,
  SUOTempHum,
  SUONoiseLevel,
  SUODoorState,
  SUOCommandResult,
} from '../../types/suo.types';

export class V5008Normalizer extends BaseNormalizer {
  readonly name = 'V5008Normalizer';

  supports(sifMessage: SIFMessage): boolean {
    return sifMessage.deviceType === 'V5008';
  }

  async normalize(sifMessage: SIFMessage): Promise<AnySUOMessage | AnySUOMessage[]> {
    try {
      switch (sifMessage.messageType) {
        case 'HEARTBEAT':
          return this.normalizeHeartbeat(sifMessage as V5008HeartbeatSIF);
        case 'RFID_SNAPSHOT':
          return this.normalizeRfidSnapshot(sifMessage as V5008RfidSnapshotSIF);
        case 'TEMP_HUM':
          return this.normalizeTempHum(sifMessage as V5008TempHumSIF);
        case 'NOISE_LEVEL':
          return this.normalizeNoiseLevel(sifMessage as V5008NoiseLevelSIF);
        case 'DOOR_STATE':
          return this.normalizeDoorState(sifMessage as V5008DoorStateSIF);
        case 'DEVICE_INFO':
          return this.normalizeDeviceInfo(sifMessage as V5008DeviceInfoSIF);
        case 'MODULE_INFO':
          return this.normalizeModuleInfo(sifMessage as V5008ModuleInfoSIF);
        case 'QUERY_COLOR_RESP':
        case 'SET_COLOR_RESP':
        case 'CLEAR_ALARM_RESP':
          return this.normalizeCommandResponse(
            sifMessage as V5008QueryColorRespSIF | V5008SetColorRespSIF | V5008ClearAlarmRespSIF
          );
        default:
          throw new NormalizerError(
            `Unsupported V5008 message type: ${sifMessage.messageType}`,
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
        'Unexpected error normalizing V5008 message',
        error instanceof Error ? error : undefined,
        { messageType: sifMessage.messageType }
      );
    }
  }

  /**
   * Normalize HEARTBEAT to SUO_HEARTBEAT
   */
  private normalizeHeartbeat(sif: V5008HeartbeatSIF): SUOHeartbeat {
    const base = this.createBaseSUO(sif, 'SUO_HEARTBEAT' as const, null, null);
    return {
      suoType: 'SUO_HEARTBEAT',
      deviceId: base.deviceId,
      deviceType: base.deviceType,
      serverTimestamp: base.serverTimestamp,
      deviceTimestamp: base.deviceTimestamp,
      messageId: base.messageId,
      meta: {
        busVoltage: null,
        busCurrent: null,
        mainPower: null,
        backupPower: null,
      },
      modules: sif.data.map(module => ({
        moduleIndex: module.moduleIndex,
        moduleId: module.moduleId,
        uTotal: module.uTotal,
      })),
    };
  }

  /**
   * Normalize RFID_SNAPSHOT to SUO_RFID_SNAPSHOT
   * Note: V5008 has only one module per message, no flattening needed
   */
  private normalizeRfidSnapshot(sif: V5008RfidSnapshotSIF): SUORfidSnapshot {
    const base = this.createBaseSUO(
      sif,
      'SUO_RFID_SNAPSHOT' as const,
      sif.moduleIndex,
      sif.moduleId
    );
    return {
      ...base,
      moduleIndex: sif.moduleIndex,
      moduleId: sif.moduleId,
      data: {
        sensors: sif.data.map(sensor => ({
          sensorIndex: sensor.sensorIndex,
          tagId: sensor.tagId || null,
          isAlarm: sensor.isAlarm,
        })),
      },
    };
  }

  /**
   * Normalize TEMP_HUM to SUO_TEMP_HUM
   * Note: V5008 has only one module per message, no flattening needed
   */
  private normalizeTempHum(sif: V5008TempHumSIF): SUOTempHum {
    const base = this.createBaseSUO(sif, 'SUO_TEMP_HUM' as const, sif.moduleIndex, sif.moduleId);
    return {
      ...base,
      moduleIndex: sif.moduleIndex,
      moduleId: sif.moduleId,
      data: {
        sensors: sif.data.map(sensor => ({
          sensorIndex: sensor.sensorIndex,
          temp: sensor.temp ?? null,
          hum: sensor.hum ?? null,
        })),
      },
    };
  }

  /**
   * Normalize NOISE_LEVEL to SUO_NOISE_LEVEL
   */
  private normalizeNoiseLevel(sif: V5008NoiseLevelSIF): SUONoiseLevel {
    const base = this.createBaseSUO(sif, 'SUO_NOISE_LEVEL' as const, sif.moduleIndex, sif.moduleId);
    return {
      ...base,
      moduleIndex: sif.moduleIndex,
      moduleId: sif.moduleId,
      data: {
        sensors: sif.data.map(sensor => ({
          sensorIndex: sensor.sensorIndex,
          noise: sensor.noise ?? null,
        })),
      },
    };
  }

  /**
   * Normalize DOOR_STATE to SUO_DOOR_STATE
   */
  private normalizeDoorState(sif: V5008DoorStateSIF): SUODoorState {
    const base = this.createBaseSUO(sif, 'SUO_DOOR_STATE' as const, sif.moduleIndex, sif.moduleId);
    return {
      ...base,
      moduleIndex: sif.moduleIndex,
      moduleId: sif.moduleId,
      door1State: sif.door1State,
      door2State: sif.door2State,
      data: {},
    };
  }

  /**
   * Normalize DEVICE_INFO to SUO_DEV_MOD
   */
  private normalizeDeviceInfo(sif: V5008DeviceInfoSIF): SUODevMod {
    const base = this.createBaseSUO(sif, 'SUO_DEV_MOD' as const, null, null);
    return {
      suoType: 'SUO_DEV_MOD',
      deviceId: base.deviceId,
      deviceType: base.deviceType,
      serverTimestamp: base.serverTimestamp,
      deviceTimestamp: base.deviceTimestamp,
      messageId: base.messageId,
      ip: sif.ip || null,
      mask: sif.mask || null,
      gwIp: sif.gwIp || null,
      mac: sif.mac || null,
      model: sif.model || null,
      fwVer: sif.fwVer || null,
      modules: [], // DEVICE_INFO doesn't include module list
    };
  }

  /**
   * Normalize MODULE_INFO to SUO_DEV_MOD
   */
  private normalizeModuleInfo(sif: V5008ModuleInfoSIF): SUODevMod {
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
        moduleId: '', // V5008 MODULE_INFO doesn't include moduleId
        fwVer: module.fwVer,
        uTotal: 0, // V5008 MODULE_INFO doesn't include uTotal
      })),
    };
  }

  /**
   * Normalize command responses to SUO_COMMAND_RESULT
   */
  private normalizeCommandResponse(
    sif: V5008QueryColorRespSIF | V5008SetColorRespSIF | V5008ClearAlarmRespSIF
  ): SUOCommandResult {
    let commandType: string;
    let colorCodes: number[] | undefined = undefined;

    switch (sif.messageType) {
      case 'QUERY_COLOR_RESP':
        commandType = 'QUERY_COLOR';
        colorCodes = sif.data;
        break;
      case 'SET_COLOR_RESP':
        commandType = 'SET_COLOR';
        break;
      case 'CLEAR_ALARM_RESP':
        commandType = 'CLEAR_ALARM';
        break;
      default:
        commandType = 'UNKNOWN';
    }

    const base = this.createBaseSUO(sif, 'SUO_COMMAND_RESULT' as const, sif.moduleIndex, '');
    return {
      ...base,
      moduleIndex: sif.moduleIndex,
      moduleId: '',
      data: {
        commandType,
        result: sif.result,
        originalReq: sif.originalReq,
        colorCodes,
      },
    };
  }
}
