/**
 * V5008 Parser
 *
 * Parser for V5008 binary protocol messages
 * Based on V5008_Spec.md
 */

import { IMessageParser, RawMQTTMessage, ParserError, extractDeviceId } from './parser.interface';
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
} from '../../types/index';

/**
 * Parse signed float using Algorithm A from V5008 spec
 * Used for temp and hum values (1-byte fields)
 * Binary Input: [IntegerByte, FractionByte]
 *
 * TEMP_HUM uses 1-byte Int and 1-byte Frac (device original design)
 */
function parseSignedFloat(integerByte: number, fractionByte: number): number {
  // 1. Check Sign Bit (Two's Complement)
  const signedInt = integerByte & 0x80 ? (0xff - integerByte + 1) * -1 : integerByte;

  // 2. Combine with Fraction
  // Note: Fraction adds magnitude to the signed base
  const value = signedInt + Math.sign(signedInt || 1) * (fractionByte / 100);

  return Number(value.toFixed(2));
}

/**
 * Parse 4-byte field to string using Algorithm D
 * Read as unsigned 32-bit big-endian integer, convert to string
 */
function parseUint32ToString(buffer: Buffer, offset: number): string {
  return buffer.readUInt32BE(offset).toString();
}

/**
 * Format IP address from 4 bytes to dot-notation string
 */
function formatIpAddress(buffer: Buffer, offset: number): string {
  return `${buffer[offset]}.${buffer[offset + 1]}.${buffer[offset + 2]}.${buffer[offset + 3]}`;
}

/**
 * Format MAC address from 6 bytes to colon-separated hex string
 */
function formatMacAddress(buffer: Buffer, offset: number): string {
  const bytes = [];
  for (let i = 0; i < 6; i++) {
    bytes.push(buffer[offset + i].toString(16).toUpperCase().padStart(2, '0'));
  }
  return bytes.join(':');
}

/**
 * Convert buffer to hex string (uppercase, no spaces)
 */
function bufferToHex(buffer: Buffer): string {
  return buffer.toString('hex').toUpperCase();
}

export class V5008Parser implements IMessageParser {
  readonly name = 'V5008Parser';

  supports(deviceType: string): boolean {
    return deviceType === 'V5008';
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

      const buffer = rawMessage.payload;
      const rawHex = bufferToHex(buffer);

      // Determine message type based on topic and header
      const messageType = this.detectMessageType(rawMessage.topic, buffer);

      // Build base SIF fields (without messageType)
      const baseFields = {
        meta: {
          topic: rawMessage.topic,
          rawHex,
        },
        deviceType: 'V5008' as const,
        deviceId,
      };

      // Parse based on message type
      switch (messageType) {
        case 'HEARTBEAT':
          return this.parseHeartbeat(baseFields, buffer);
        case 'RFID_SNAPSHOT':
          return this.parseRfidSnapshot(baseFields, buffer);
        case 'TEMP_HUM':
          return this.parseTempHum(baseFields, buffer);
        case 'NOISE_LEVEL':
          return this.parseNoiseLevel(baseFields, buffer);
        case 'DOOR_STATE':
          return this.parseDoorState(baseFields, buffer);
        case 'DEVICE_INFO':
          return this.parseDeviceInfo(baseFields, buffer);
        case 'MODULE_INFO':
          return this.parseModuleInfo(baseFields, buffer);
        case 'QUERY_COLOR_RESP':
          return this.parseQueryColorResp(baseFields, buffer);
        case 'SET_COLOR_RESP':
          return this.parseSetColorResp(baseFields, buffer);
        case 'CLEAR_ALARM_RESP':
          return this.parseClearAlarmResp(baseFields, buffer);
        default:
          throw new ParserError(`Unknown message type: ${messageType}`, undefined, {
            topic: rawMessage.topic,
            header: buffer[0]?.toString(16),
          });
      }
    } catch (error) {
      if (error instanceof ParserError) {
        throw error;
      }
      throw new ParserError(
        'Unexpected error parsing V5008 message',
        error instanceof Error ? error : undefined,
        { topic: rawMessage.topic }
      );
    }
  }

  /**
   * Detect message type based on topic and header bytes
   */
  private detectMessageType(topic: string, buffer: Buffer): string {
    // Check topic suffix first
    if (topic.endsWith('/LabelState')) {
      return 'RFID_SNAPSHOT';
    }
    if (topic.endsWith('/TemHum')) {
      return 'TEMP_HUM';
    }
    if (topic.endsWith('/Noise')) {
      return 'NOISE_LEVEL';
    }

    // Check header byte for OpeAck messages
    const header = buffer[0];

    // HEARTBEAT: 0xCC or 0xCB
    if (header === 0xcc || header === 0xcb) {
      return 'HEARTBEAT';
    }

    // DOOR_STATE: 0xBA
    if (header === 0xba) {
      return 'DOOR_STATE';
    }

    // Extended headers (2 bytes)
    if (buffer.length >= 2) {
      const extendedHeader = (header << 8) | buffer[1];

      // DEVICE_INFO: 0xEF01
      if (extendedHeader === 0xef01) {
        return 'DEVICE_INFO';
      }

      // MODULE_INFO: 0xEF02
      if (extendedHeader === 0xef02) {
        return 'MODULE_INFO';
      }
    }

    // Command responses: 0xAA
    // Structure: Header(1) + DeviceId(4) + Res(1) + CmdCode(1) + ...
    if (header === 0xaa && buffer.length >= 7) {
      // Check byte 6 for command codes (after DeviceId(4) + Res(1))
      const cmdCode = buffer[6];
      if (cmdCode === 0xe4) {
        return 'QUERY_COLOR_RESP';
      }
      if (cmdCode === 0xe1) {
        return 'SET_COLOR_RESP';
      }
      if (cmdCode === 0xe2) {
        return 'CLEAR_ALARM_RESP';
      }
    }

    throw new ParserError(
      `Cannot determine message type from header: 0x${header?.toString(16).toUpperCase()}`,
      undefined,
      {
        header: header?.toString(16),
        topic,
      }
    );
  }

  /**
   * Parse HEARTBEAT messages
   * Schema: Header(1) + [ModAddr(1) + ModId(4) + Total(1)] × 10 + MsgId(4)
   */
  private parseHeartbeat(
    baseFields: Pick<SIFMessage, 'meta' | 'deviceType' | 'deviceId'>,
    buffer: Buffer
  ): V5008HeartbeatSIF {
    // Validate minimum buffer size: Header(1) + 10 modules × 6 bytes + MsgId(4) = 65 bytes
    if (buffer.length < 65) {
      throw new ParserError('HEARTBEAT message too short', undefined, {
        expected: 65,
        actual: buffer.length,
      });
    }

    // Parse message ID (last 4 bytes) using Algorithm D
    const messageId = parseUint32ToString(buffer, buffer.length - 4);

    // Parse modules (10 slots, 6 bytes each)
    const modules = [];
    for (let i = 0; i < 10; i++) {
      const offset = 1 + i * 6;
      const modAddr = buffer[offset];
      const modId = buffer.readUInt32BE(offset + 1);
      const total = buffer[offset + 5];

      // Filter: skip if ModId == 0 or ModAddr > 5
      if (modId !== 0 && modAddr <= 5) {
        modules.push({
          moduleIndex: modAddr,
          moduleId: modId.toString(),
          uTotal: total,
        });
      }
    }

    return {
      ...baseFields,
      messageType: 'HEARTBEAT',
      messageId,
      data: modules,
    };
  }

  /**
   * Parse RFID_SNAPSHOT messages
   * Schema: Header(1) + ModAddr(1) + ModId(4) + Res(1) + Total(1) + Count(1) + [uPos(1) + Alarm(1) + TagId(4)] × Count + MsgId(4)
   */
  private parseRfidSnapshot(
    baseFields: Pick<SIFMessage, 'meta' | 'deviceType' | 'deviceId'>,
    buffer: Buffer
  ): V5008RfidSnapshotSIF {
    // Minimum size: Header(1) + ModAddr(1) + ModId(4) + Res(1) + Total(1) + Count(1) + MsgId(4) = 13 bytes
    if (buffer.length < 13) {
      throw new ParserError('RFID_SNAPSHOT message too short', undefined, {
        actual: buffer.length,
      });
    }

    const modAddr = buffer[1];
    const modId = buffer.readUInt32BE(2);
    // Skip Res byte at offset 6
    const total = buffer[7];
    const count = buffer[8];

    // Parse sensor data
    const sensors = [];
    for (let i = 0; i < count; i++) {
      const offset = 9 + i * 6;
      if (offset + 6 > buffer.length - 4) {
        break; // Not enough data for this sensor
      }

      const uPos = buffer[offset];
      const alarm = buffer[offset + 1];
      const tagId = buffer
        .slice(offset + 2, offset + 6)
        .toString('hex')
        .toUpperCase();

      sensors.push({
        sensorIndex: uPos,
        isAlarm: alarm === 1,
        tagId,
      });
    }

    // Parse message ID (last 4 bytes)
    const messageId = parseUint32ToString(buffer, buffer.length - 4);

    return {
      ...baseFields,
      messageType: 'RFID_SNAPSHOT',
      messageId,
      moduleIndex: modAddr,
      moduleId: modId.toString(),
      uTotal: total,
      data: sensors,
    };
  }

  /**
   * Parse TEMP_HUM messages
   * Schema: ModAddr(1) + ModId(4) + [Addr(1) + T_Int(1) + T_Frac(1) + H_Int(1) + H_Frac(1)] × 6 + MsgId(4)
   */
  private parseTempHum(
    baseFields: Pick<SIFMessage, 'meta' | 'deviceType' | 'deviceId'>,
    buffer: Buffer
  ): V5008TempHumSIF {
    // Size: ModAddr(1) + ModId(4) + 6 slots × 5 bytes + MsgId(4) = 39 bytes
    if (buffer.length < 39) {
      throw new ParserError('TEMP_HUM message too short', undefined, {
        actual: buffer.length,
      });
    }

    const modAddr = buffer[0];
    const modId = buffer.readUInt32BE(1);

    // Parse sensor data (6 slots)
    const sensors = [];
    for (let i = 0; i < 6; i++) {
      const offset = 5 + i * 5;
      const addr = buffer[offset];

      // Skip if Addr == 0 (no sensor)
      if (addr === 0) {
        continue;
      }

      const tInt = buffer[offset + 1];
      const tFrac = buffer[offset + 2];
      const hInt = buffer[offset + 3];
      const hFrac = buffer[offset + 4];

      sensors.push({
        sensorIndex: addr,
        temp: parseSignedFloat(tInt, tFrac),
        hum: parseSignedFloat(hInt, hFrac),
      });
    }

    // Parse message ID (last 4 bytes)
    const messageId = parseUint32ToString(buffer, buffer.length - 4);

    return {
      ...baseFields,
      messageType: 'TEMP_HUM',
      messageId,
      moduleIndex: modAddr,
      moduleId: modId.toString(),
      data: sensors,
    };
  }

  /**
   * Parse NOISE_LEVEL messages
   * Schema: ModAddr(1) + ModId(4) + [Addr(1) + Noise(4)] × 3 + MsgId(4)
   * Total: 1 + 4 + (1+4) × 3 + 4 = 24 bytes
   * Note: Noise is 4-byte big-endian float (different from TEMP_HUM which uses split Int+Frac)
   */
  private parseNoiseLevel(
    baseFields: Pick<SIFMessage, 'meta' | 'deviceType' | 'deviceId'>,
    buffer: Buffer
  ): V5008NoiseLevelSIF {
    // Size: ModAddr(1) + ModId(4) + 3 slots × 5 bytes + MsgId(4) = 24 bytes
    if (buffer.length < 24) {
      throw new ParserError('NOISE_LEVEL message too short', undefined, {
        expected: 24,
        actual: buffer.length,
      });
    }

    const modAddr = buffer[0];
    const modId = buffer.readUInt32BE(1);

    // Parse sensor data (3 slots)
    const sensors = [];
    for (let i = 0; i < 3; i++) {
      const offset = 5 + i * 5; // Each slot is 5 bytes: Addr(1) + Noise(4)
      const addr = buffer[offset];

      // Skip if Addr == 0 (no sensor)
      if (addr === 0) {
        continue;
      }

      // Read 4-byte big-endian float
      const noise = buffer.readFloatBE(offset + 1);

      sensors.push({
        sensorIndex: addr,
        noise: Number(noise.toFixed(2)),
      });
    }

    // Parse message ID (last 4 bytes)
    const messageId = parseUint32ToString(buffer, buffer.length - 4);

    return {
      ...baseFields,
      messageType: 'NOISE_LEVEL',
      messageId,
      moduleIndex: modAddr,
      moduleId: modId.toString(),
      data: sensors,
    };
  }

  /**
   * Parse DOOR_STATE messages
   * Schema: Header(1) + ModAddr(1) + ModId(4) + State(1) + MsgId(4)
   */
  private parseDoorState(
    baseFields: Pick<SIFMessage, 'meta' | 'deviceType' | 'deviceId'>,
    buffer: Buffer
  ): V5008DoorStateSIF {
    // Size: Header(1) + ModAddr(1) + ModId(4) + State(1) + MsgId(4) = 11 bytes
    if (buffer.length < 11) {
      throw new ParserError('DOOR_STATE message too short', undefined, {
        actual: buffer.length,
      });
    }

    const modAddr = buffer[1];
    const modId = buffer.readUInt32BE(2);
    const state = buffer[6];
    const messageId = parseUint32ToString(buffer, 7);

    return {
      ...baseFields,
      messageType: 'DOOR_STATE',
      messageId,
      moduleIndex: modAddr,
      moduleId: modId.toString(),
      door1State: state,
      door2State: null,
    };
  }

  /**
   * Parse DEVICE_INFO messages
   * Schema: Header(2) + Model(2) + Fw(4) + IP(4) + Mask(4) + Gw(4) + Mac(6) + MsgId(4)
   */
  private parseDeviceInfo(
    baseFields: Pick<SIFMessage, 'meta' | 'deviceType' | 'deviceId'>,
    buffer: Buffer
  ): V5008DeviceInfoSIF {
    // Size: Header(2) + Model(2) + Fw(4) + IP(4) + Mask(4) + Gw(4) + Mac(6) + MsgId(4) = 30 bytes
    if (buffer.length < 30) {
      throw new ParserError('DEVICE_INFO message too short', undefined, {
        actual: buffer.length,
      });
    }

    const model = buffer.slice(2, 4).toString('hex').toUpperCase();
    const fwVer = parseUint32ToString(buffer, 4);
    const ip = formatIpAddress(buffer, 8);
    const mask = formatIpAddress(buffer, 12);
    const gwIp = formatIpAddress(buffer, 16);
    const mac = formatMacAddress(buffer, 20);
    const messageId = parseUint32ToString(buffer, 26);

    return {
      ...baseFields,
      messageType: 'DEVICE_INFO',
      messageId,
      fwVer,
      ip,
      mask,
      gwIp,
      mac,
      model,
    };
  }

  /**
   * Parse MODULE_INFO messages
   * Schema: Header(2) + [ModAddr(1) + Fw(4)] × N + MsgId(4)
   * Logic: N = (Buffer.length - 6) / 5
   */
  private parseModuleInfo(
    baseFields: Pick<SIFMessage, 'meta' | 'deviceType' | 'deviceId'>,
    buffer: Buffer
  ): V5008ModuleInfoSIF {
    // Minimum size: Header(2) + 1 module(5) + MsgId(4) = 11 bytes
    if (buffer.length < 11) {
      throw new ParserError('MODULE_INFO message too short', undefined, {
        actual: buffer.length,
      });
    }

    // Calculate N: N = (Buffer.length - 6) / 5
    const n = Math.floor((buffer.length - 6) / 5);

    // Parse modules
    const modules = [];
    for (let i = 0; i < n; i++) {
      const offset = 2 + i * 5;
      const modAddr = buffer[offset];
      const fwVer = parseUint32ToString(buffer, offset + 1);

      modules.push({
        moduleIndex: modAddr,
        fwVer,
      });
    }

    // Parse message ID (last 4 bytes)
    const messageId = parseUint32ToString(buffer, buffer.length - 4);

    return {
      ...baseFields,
      messageType: 'MODULE_INFO',
      messageId,
      data: modules,
    };
  }

  /**
   * Parse QUERY_COLOR_RESP messages
   * Schema: Header(1) + DeviceId(4) + Result(1) + OriginalReq(2) + [ColorCode × N] + MsgId(4)
   */
  private parseQueryColorResp(
    baseFields: Pick<SIFMessage, 'meta' | 'deviceType'>,
    buffer: Buffer
  ): V5008QueryColorRespSIF {
    // Minimum size: Header(1) + DeviceId(4) + Result(1) + OriginalReq(2) + MsgId(4) = 12 bytes
    if (buffer.length < 12) {
      throw new ParserError('QUERY_COLOR_RESP message too short', undefined, {
        actual: buffer.length,
      });
    }

    const deviceId = buffer.readUInt32BE(1).toString();
    const resultByte = buffer[5];
    const result = resultByte === 0xa1 ? 'Success' : 'Failure';
    const originalReq = buffer.slice(6, 8).toString('hex').toUpperCase();

    // Extract module index from originalReq (byte 1)
    const moduleIndex = buffer[7];

    // Parse color codes (remaining bytes before MsgId)
    const colorCodes = [];
    const colorCodeCount = buffer.length - 12;
    for (let i = 0; i < colorCodeCount; i++) {
      colorCodes.push(buffer[8 + i]);
    }

    // Parse message ID (last 4 bytes)
    const messageId = parseUint32ToString(buffer, buffer.length - 4);

    return {
      ...baseFields,
      messageType: 'QUERY_COLOR_RESP',
      messageId,
      deviceId,
      result,
      originalReq,
      moduleIndex,
      data: colorCodes,
    };
  }

  /**
   * Parse SET_COLOR_RESP messages
   * Schema: Header(1) + DeviceId(4) + Result(1) + OriginalReq(var) + MsgId(4)
   */
  private parseSetColorResp(
    baseFields: Pick<SIFMessage, 'meta' | 'deviceType'>,
    buffer: Buffer
  ): V5008SetColorRespSIF {
    // Minimum size: Header(1) + DeviceId(4) + Result(1) + OriginalReq(2) + MsgId(4) = 12 bytes
    if (buffer.length < 12) {
      throw new ParserError('SET_COLOR_RESP message too short', undefined, {
        actual: buffer.length,
      });
    }

    const deviceId = buffer.readUInt32BE(1).toString();
    const resultByte = buffer[5];
    const result = resultByte === 0xa1 ? 'Success' : 'Failure';

    // OriginalReq is variable length: Total - Header(1) - DevId(4) - Result(1) - MsgId(4)
    const originalReqLength = buffer.length - 10;
    const originalReq = buffer
      .slice(6, 6 + originalReqLength)
      .toString('hex')
      .toUpperCase();

    // Extract module index from originalReq (byte 1)
    const moduleIndex = buffer[7];

    // Parse message ID (last 4 bytes)
    const messageId = parseUint32ToString(buffer, buffer.length - 4);

    return {
      ...baseFields,
      messageType: 'SET_COLOR_RESP',
      messageId,
      deviceId,
      result,
      originalReq,
      moduleIndex,
    };
  }

  /**
   * Parse CLEAR_ALARM_RESP messages
   * Schema: Header(1) + DeviceId(4) + Result(1) + OriginalReq(3) + MsgId(4)
   */
  private parseClearAlarmResp(
    baseFields: Pick<SIFMessage, 'meta' | 'deviceType'>,
    buffer: Buffer
  ): V5008ClearAlarmRespSIF {
    // Size: Header(1) + DeviceId(4) + Result(1) + OriginalReq(3) + MsgId(4) = 13 bytes
    if (buffer.length < 13) {
      throw new ParserError('CLEAR_ALARM_RESP message too short', undefined, {
        actual: buffer.length,
      });
    }

    const deviceId = buffer.readUInt32BE(1).toString();
    const resultByte = buffer[5];
    const result = resultByte === 0xa1 ? 'Success' : 'Failure';
    const originalReq = buffer.slice(6, 9).toString('hex').toUpperCase();

    // Extract module index from originalReq (byte 1)
    const moduleIndex = buffer[7];

    // Parse message ID (last 4 bytes)
    const messageId = parseUint32ToString(buffer, buffer.length - 4);

    return {
      ...baseFields,
      messageType: 'CLEAR_ALARM_RESP',
      messageId,
      deviceId,
      result,
      originalReq,
      moduleIndex,
    };
  }
}
