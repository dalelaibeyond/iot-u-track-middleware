/**
 * V6800 Parser Tests
 * 
 * Test-Driven Development (TDD) for V6800 JSON protocol parser
 */

import { V6800Parser } from '@core/parser/v6800-parser';
import {
  V6800_DEV_MOD_INFO_FIXTURES,
  V6800_MOD_CHNG_EVENT_FIXTURES,
  V6800_HEARTBEAT_FIXTURES,
  V6800_RFID_EVENT_FIXTURES,
  V6800_RFID_SNAPSHOT_FIXTURES,
  V6800_TEMP_HUM_FIXTURES,
  V6800_DOOR_STATE_FIXTURES,
  V6800_COMMAND_RESP_FIXTURES,
} from '@fixtures/v6800';
import { RawMQTTMessage } from '@core/parser/parser.interface';
import {
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
} from '@t/index';

describe('V6800 Parser', () => {
  let parser: V6800Parser;

  beforeEach(() => {
    parser = new V6800Parser();
  });

  describe('Device Type Support', () => {
    it('should support V6800 device type', () => {
      expect(parser.supports('V6800')).toBe(true);
    });

    it('should not support V5008 device type', () => {
      expect(parser.supports('V5008')).toBe(false);
    });

    it('should not support unknown device types', () => {
      expect(parser.supports('UNKNOWN')).toBe(false);
      expect(parser.supports('')).toBe(false);
    });
  });

  describe('DEV_MOD_INFO Message Parsing', () => {
    it('should parse single module DEV_MOD_INFO message', async () => {
      const fixture = V6800_DEV_MOD_INFO_FIXTURES[0]; // Single module
      
      const rawMessage: RawMQTTMessage = {
        topic: fixture.topic,
        payload: Buffer.from(JSON.stringify(fixture.rawJson)),
        qos: 1,
        retain: false,
        timestamp: new Date(),
      };

      const result = (await parser.parse(rawMessage)) as V6800DevModInfoSIF;

      expect(result).toBeDefined();
      expect(result.deviceType).toBe('V6800');
      expect(result.messageType).toBe('DEV_MOD_INFO');
      expect(result.deviceId).toBe(fixture.expectedSIF.deviceId);
      expect(result.messageId).toBe(fixture.expectedSIF.messageId);
      expect(result.ip).toBe(fixture.expectedSIF.ip);
      expect(result.mac).toBe(fixture.expectedSIF.mac);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual({
        moduleIndex: fixture.expectedSIF.data[0].moduleIndex,
        moduleId: fixture.expectedSIF.data[0].moduleId,
        fwVer: fixture.expectedSIF.data[0].fwVer,
        uTotal: fixture.expectedSIF.data[0].uTotal,
      });
    });

    it('should parse multiple modules DEV_MOD_INFO message', async () => {
      const fixture = V6800_DEV_MOD_INFO_FIXTURES[1]; // Multiple modules
      
      const rawMessage: RawMQTTMessage = {
        topic: fixture.topic,
        payload: Buffer.from(JSON.stringify(fixture.rawJson)),
        qos: 1,
        retain: false,
        timestamp: new Date(),
      };

      const result = (await parser.parse(rawMessage)) as V6800DevModInfoSIF;

      expect(result).toBeDefined();
      expect(result.data).toHaveLength(2);
      expect(result.data[0].moduleIndex).toBe(1);
      expect(result.data[1].moduleIndex).toBe(2);
    });

    it('should transform snake_case to camelCase', async () => {
      const fixture = V6800_DEV_MOD_INFO_FIXTURES[0];
      
      const rawMessage: RawMQTTMessage = {
        topic: fixture.topic,
        payload: Buffer.from(JSON.stringify(fixture.rawJson)),
        qos: 1,
        retain: false,
        timestamp: new Date(),
      };

      const result = (await parser.parse(rawMessage)) as V6800DevModInfoSIF;

      // Check that snake_case fields are transformed to camelCase
      expect(result.data[0].moduleIndex).toBeDefined();
      expect(result.data[0].moduleId).toBeDefined();
      expect(result.data[0].fwVer).toBeDefined();
      expect(result.data[0].uTotal).toBeDefined();
      
      // Original snake_case should NOT be present
      expect((result.data[0] as any).module_index).toBeUndefined();
      expect((result.data[0] as any).module_sn).toBeUndefined();
    });

    it('should discard unused fields from raw message', async () => {
      const fixture = V6800_DEV_MOD_INFO_FIXTURES[0];
      
      const rawMessage: RawMQTTMessage = {
        topic: fixture.topic,
        payload: Buffer.from(JSON.stringify(fixture.rawJson)),
        qos: 1,
        retain: false,
        timestamp: new Date(),
      };

      const result = (await parser.parse(rawMessage)) as V6800DevModInfoSIF;

      // These fields should be discarded per spec
      expect((result.data[0] as any).module_type).toBeUndefined();
      expect((result.data[0] as any).module_m_num).toBeUndefined();
      expect((result.data[0] as any).module_supplier).toBeUndefined();
      expect((result.data[0] as any).module_brand).toBeUndefined();
      expect((result.data[0] as any).module_model).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should throw error for invalid JSON', async () => {
      const rawMessage: RawMQTTMessage = {
        topic: 'V6800Upload/123/Init',
        payload: Buffer.from('not valid json'), // Invalid JSON
        qos: 1,
        retain: false,
        timestamp: new Date(),
      };

      await expect(parser.parse(rawMessage)).rejects.toThrow();
    });

    it('should throw error for missing required fields', async () => {
      const invalidJson = {
        // Missing msg_type
        gateway_sn: '123',
        uuid_number: 'abc',
        data: [],
      };

      const rawMessage: RawMQTTMessage = {
        topic: 'V6800Upload/123/Init',
        payload: Buffer.from(JSON.stringify(invalidJson)),
        qos: 1,
        retain: false,
        timestamp: new Date(),
      };

      await expect(parser.parse(rawMessage)).rejects.toThrow();
    });

    it('should throw error for unknown msg_type', async () => {
      const unknownType = {
        msg_type: 'unknown_type',
        gateway_sn: '123',
        uuid_number: 'abc',
        data: [],
      };

      const rawMessage: RawMQTTMessage = {
        topic: 'V6800Upload/123/Init',
        payload: Buffer.from(JSON.stringify(unknownType)),
        qos: 1,
        retain: false,
        timestamp: new Date(),
      };

      await expect(parser.parse(rawMessage)).rejects.toThrow();
    });

    it('should throw error for invalid topic format', async () => {
      const rawMessage: RawMQTTMessage = {
        topic: 'InvalidTopic/123',
        payload: Buffer.from('{}'),
        qos: 1,
        retain: false,
        timestamp: new Date(),
      };

      await expect(parser.parse(rawMessage)).rejects.toThrow();
    });
  });

  describe('Field Transformation', () => {
    it('should handle typo in msg_type (nofity → notify)', async () => {
      const typoJson = {
        msg_type: 'temper_humidity_exception_nofity_req', // Typo: nofity
        gateway_sn: '123',
        uuid_number: 'abc',
        data: [],
      };

      const rawMessage: RawMQTTMessage = {
        topic: 'V6800Upload/123/TemHum',
        payload: Buffer.from(JSON.stringify(typoJson)),
        qos: 1,
        retain: false,
        timestamp: new Date(),
      };

      // Should correct the typo and parse successfully
      const result = await parser.parse(rawMessage);
      expect(result.messageType).toBe('TEMP_HUM');
    });

    it('should convert numeric fields to strings where required', async () => {
      const fixture = V6800_DEV_MOD_INFO_FIXTURES[0];
      
      const rawMessage: RawMQTTMessage = {
        topic: fixture.topic,
        payload: Buffer.from(JSON.stringify(fixture.rawJson)),
        qos: 1,
        retain: false,
        timestamp: new Date(),
      };

      const result = (await parser.parse(rawMessage)) as V6800DevModInfoSIF;

      // moduleId should be string (converted from number in raw)
      expect(typeof result.data[0].moduleId).toBe('string');
    });

    it('should preserve UUID format for messageId', async () => {
      const fixture = V6800_DEV_MOD_INFO_FIXTURES[0];

      const rawMessage: RawMQTTMessage = {
        topic: fixture.topic,
        payload: Buffer.from(JSON.stringify(fixture.rawJson)),
        qos: 1,
        retain: false,
        timestamp: new Date(),
      };

      const result = (await parser.parse(rawMessage)) as V6800DevModInfoSIF;

      expect(result.messageId).toBe('550e8400-e29b-41d4-a716-446655440000');
    });
  });

  describe('MOD_CHNG_EVENT Message Parsing', () => {
    it('should parse MOD_CHNG_EVENT with single module', async () => {
      const fixture = V6800_MOD_CHNG_EVENT_FIXTURES[0];

      const rawMessage: RawMQTTMessage = {
        topic: fixture.topic,
        payload: Buffer.from(JSON.stringify(fixture.rawJson)),
        qos: 1,
        retain: false,
        timestamp: new Date(),
      };

      const result = (await parser.parse(rawMessage)) as V6800ModChngEventSIF;

      expect(result).toBeDefined();
      expect(result.deviceType).toBe('V6800');
      expect(result.messageType).toBe('MOD_CHNG_EVENT');
      expect(result.deviceId).toBe(fixture.expectedSIF.deviceId);
      expect(result.messageId).toBe(fixture.expectedSIF.messageId);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual(fixture.expectedSIF.data[0]);
    });

    it('should parse MOD_CHNG_EVENT with multiple modules', async () => {
      const fixture = V6800_MOD_CHNG_EVENT_FIXTURES[1];

      const rawMessage: RawMQTTMessage = {
        topic: fixture.topic,
        payload: Buffer.from(JSON.stringify(fixture.rawJson)),
        qos: 1,
        retain: false,
        timestamp: new Date(),
      };

      const result = (await parser.parse(rawMessage)) as V6800ModChngEventSIF;

      expect(result).toBeDefined();
      expect(result.data).toHaveLength(2);
      expect(result.data[0].moduleIndex).toBe(1);
      expect(result.data[1].moduleIndex).toBe(2);
    });
  });

  describe('HEARTBEAT Message Parsing', () => {
    it('should parse HEARTBEAT with single module', async () => {
      const fixture = V6800_HEARTBEAT_FIXTURES[0];

      const rawMessage: RawMQTTMessage = {
        topic: fixture.topic,
        payload: Buffer.from(JSON.stringify(fixture.rawJson)),
        qos: 1,
        retain: false,
        timestamp: new Date(),
      };

      const result = (await parser.parse(rawMessage)) as V6800HeartbeatSIF;

      expect(result).toBeDefined();
      expect(result.deviceType).toBe('V6800');
      expect(result.messageType).toBe('HEARTBEAT');
      expect(result.deviceId).toBe(fixture.expectedSIF.deviceId);
      expect(result.messageId).toBe(fixture.expectedSIF.messageId);
      expect(result.meta.busVoltage).toBe('12.5');
      expect(result.meta.busCurrent).toBe('2.3');
      expect(result.meta.mainPower).toBe(1);
      expect(result.meta.backupPower).toBe(0);
      expect(result.data).toHaveLength(1);
    });

    it('should parse HEARTBEAT with multiple modules', async () => {
      const fixture = V6800_HEARTBEAT_FIXTURES[1];

      const rawMessage: RawMQTTMessage = {
        topic: fixture.topic,
        payload: Buffer.from(JSON.stringify(fixture.rawJson)),
        qos: 1,
        retain: false,
        timestamp: new Date(),
      };

      const result = (await parser.parse(rawMessage)) as V6800HeartbeatSIF;

      expect(result).toBeDefined();
      expect(result.data).toHaveLength(2);
      expect(result.meta.mainPower).toBe(1);
      expect(result.meta.backupPower).toBe(1);
    });
  });

  describe('RFID_EVENT Message Parsing', () => {
    it('should parse RFID_EVENT with tag attached', async () => {
      const fixture = V6800_RFID_EVENT_FIXTURES[0];

      const rawMessage: RawMQTTMessage = {
        topic: fixture.topic,
        payload: Buffer.from(JSON.stringify(fixture.rawJson)),
        qos: 1,
        retain: false,
        timestamp: new Date(),
      };

      const result = (await parser.parse(rawMessage)) as V6800RfidEventSIF;

      expect(result).toBeDefined();
      expect(result.deviceType).toBe('V6800');
      expect(result.messageType).toBe('RFID_EVENT');
      expect(result.data[0].data[0].action).toBe('ATTACHED');
      expect(result.data[0].data[0].tagId).toBe('DD344A44');
      expect(result.data[0].data[0].isAlarm).toBe(false);
    });

    it('should parse RFID_EVENT with tag detached', async () => {
      const fixture = V6800_RFID_EVENT_FIXTURES[1];

      const rawMessage: RawMQTTMessage = {
        topic: fixture.topic,
        payload: Buffer.from(JSON.stringify(fixture.rawJson)),
        qos: 1,
        retain: false,
        timestamp: new Date(),
      };

      const result = (await parser.parse(rawMessage)) as V6800RfidEventSIF;

      expect(result).toBeDefined();
      expect(result.data[0].data[0].action).toBe('DETACHED');
      expect(result.data[0].data[0].tagId).toBe('DD344A45');
    });

    it('should parse RFID_EVENT with alarm', async () => {
      const fixture = V6800_RFID_EVENT_FIXTURES[2];

      const rawMessage: RawMQTTMessage = {
        topic: fixture.topic,
        payload: Buffer.from(JSON.stringify(fixture.rawJson)),
        qos: 1,
        retain: false,
        timestamp: new Date(),
      };

      const result = (await parser.parse(rawMessage)) as V6800RfidEventSIF;

      expect(result).toBeDefined();
      expect(result.data[0].data[0].isAlarm).toBe(true);
      expect(result.data[0].data[1].isAlarm).toBe(false);
    });
  });

  describe('RFID_SNAPSHOT Message Parsing', () => {
    it('should parse RFID_SNAPSHOT with single module', async () => {
      const fixture = V6800_RFID_SNAPSHOT_FIXTURES[0];

      const rawMessage: RawMQTTMessage = {
        topic: fixture.topic,
        payload: Buffer.from(JSON.stringify(fixture.rawJson)),
        qos: 1,
        retain: false,
        timestamp: new Date(),
      };

      const result = (await parser.parse(rawMessage)) as V6800RfidSnapshotSIF;

      expect(result).toBeDefined();
      expect(result.deviceType).toBe('V6800');
      expect(result.messageType).toBe('RFID_SNAPSHOT');
      expect(result.data).toHaveLength(1);
      expect(result.data[0].data).toHaveLength(3);
      expect(result.data[0].data[0].tagId).toBe('DD344A44');
      expect(result.data[0].data[0].isAlarm).toBe(false);
      expect(result.data[0].data[1].isAlarm).toBe(true);
    });

    it('should parse RFID_SNAPSHOT with multiple modules', async () => {
      const fixture = V6800_RFID_SNAPSHOT_FIXTURES[1];

      const rawMessage: RawMQTTMessage = {
        topic: fixture.topic,
        payload: Buffer.from(JSON.stringify(fixture.rawJson)),
        qos: 1,
        retain: false,
        timestamp: new Date(),
      };

      const result = (await parser.parse(rawMessage)) as V6800RfidSnapshotSIF;

      expect(result).toBeDefined();
      expect(result.data).toHaveLength(2);
      expect(result.data[0].moduleIndex).toBe(1);
      expect(result.data[1].moduleIndex).toBe(2);
    });
  });

  describe('TEMP_HUM Message Parsing', () => {
    it('should parse TEMP_HUM with single sensor', async () => {
      const fixture = V6800_TEMP_HUM_FIXTURES[0];

      const rawMessage: RawMQTTMessage = {
        topic: fixture.topic,
        payload: Buffer.from(JSON.stringify(fixture.rawJson)),
        qos: 1,
        retain: false,
        timestamp: new Date(),
      };

      const result = (await parser.parse(rawMessage)) as V6800TempHumSIF;

      expect(result).toBeDefined();
      expect(result.deviceType).toBe('V6800');
      expect(result.messageType).toBe('TEMP_HUM');
      expect(result.data[0].data[0].temp).toBe(25.5);
      expect(result.data[0].data[0].hum).toBe(65.2);
    });

    it('should parse TEMP_HUM with multiple sensors', async () => {
      const fixture = V6800_TEMP_HUM_FIXTURES[1];

      const rawMessage: RawMQTTMessage = {
        topic: fixture.topic,
        payload: Buffer.from(JSON.stringify(fixture.rawJson)),
        qos: 1,
        retain: false,
        timestamp: new Date(),
      };

      const result = (await parser.parse(rawMessage)) as V6800TempHumSIF;

      expect(result).toBeDefined();
      expect(result.data[0].data).toHaveLength(2);
      expect(result.data[0].data[0].temp).toBe(25.5);
      expect(result.data[0].data[1].temp).toBe(24.8);
    });

    it('should handle typo in TEMP_HUM msg_type', async () => {
      const fixture = V6800_TEMP_HUM_FIXTURES[2];

      const rawMessage: RawMQTTMessage = {
        topic: fixture.topic,
        payload: Buffer.from(JSON.stringify(fixture.rawJson)),
        qos: 1,
        retain: false,
        timestamp: new Date(),
      };

      const result = (await parser.parse(rawMessage)) as V6800TempHumSIF;

      expect(result).toBeDefined();
      expect(result.messageType).toBe('TEMP_HUM');
    });
  });

  describe('DOOR_STATE_EVENT Message Parsing', () => {
    it('should parse DOOR_STATE_EVENT with single door', async () => {
      const fixture = V6800_DOOR_STATE_FIXTURES[0];

      const rawMessage: RawMQTTMessage = {
        topic: fixture.topic,
        payload: Buffer.from(JSON.stringify(fixture.rawJson)),
        qos: 1,
        retain: false,
        timestamp: new Date(),
      };

      const result = (await parser.parse(rawMessage)) as V6800DoorStateEventSIF;

      expect(result).toBeDefined();
      expect(result.deviceType).toBe('V6800');
      expect(result.messageType).toBe('DOOR_STATE_EVENT');
      expect(result.data[0].door1State).toBe(1);
      expect(result.data[0].door2State).toBeNull();
    });

    it('should parse DOOR_STATE_EVENT with dual doors', async () => {
      const fixture = V6800_DOOR_STATE_FIXTURES[1];

      const rawMessage: RawMQTTMessage = {
        topic: fixture.topic,
        payload: Buffer.from(JSON.stringify(fixture.rawJson)),
        qos: 1,
        retain: false,
        timestamp: new Date(),
      };

      const result = (await parser.parse(rawMessage)) as V6800DoorStateEventSIF;

      expect(result).toBeDefined();
      expect(result.data[0].door1State).toBe(1);
      expect(result.data[0].door2State).toBe(0);
    });
  });

  describe('QUERY_DOOR_STATE_RESP Message Parsing', () => {
    it('should parse QUERY_DOOR_STATE_RESP with single door', async () => {
      const fixture = V6800_DOOR_STATE_FIXTURES[2];

      const rawMessage: RawMQTTMessage = {
        topic: fixture.topic,
        payload: Buffer.from(JSON.stringify(fixture.rawJson)),
        qos: 1,
        retain: false,
        timestamp: new Date(),
      };

      const result = (await parser.parse(rawMessage)) as V6800QueryDoorStateRespSIF;

      expect(result).toBeDefined();
      expect(result.deviceType).toBe('V6800');
      expect(result.messageType).toBe('QUERY_DOOR_STATE_RESP');
      expect(result.data[0].door1State).toBe(0);
      expect(result.data[0].door2State).toBeNull();
    });

    it('should parse QUERY_DOOR_STATE_RESP with dual doors', async () => {
      const fixture = V6800_DOOR_STATE_FIXTURES[3];

      const rawMessage: RawMQTTMessage = {
        topic: fixture.topic,
        payload: Buffer.from(JSON.stringify(fixture.rawJson)),
        qos: 1,
        retain: false,
        timestamp: new Date(),
      };

      const result = (await parser.parse(rawMessage)) as V6800QueryDoorStateRespSIF;

      expect(result).toBeDefined();
      expect(result.data[0].door1State).toBe(0);
      expect(result.data[0].door2State).toBe(1);
    });
  });

  describe('Command Response Message Parsing', () => {
    it('should parse SET_COLOR_RESP success', async () => {
      const fixture = V6800_COMMAND_RESP_FIXTURES[0];

      const rawMessage: RawMQTTMessage = {
        topic: fixture.topic,
        payload: Buffer.from(JSON.stringify(fixture.rawJson)),
        qos: 1,
        retain: false,
        timestamp: new Date(),
      };

      const result = (await parser.parse(rawMessage)) as V6800SetColorRespSIF;

      expect(result).toBeDefined();
      expect(result.deviceType).toBe('V6800');
      expect(result.messageType).toBe('SET_COLOR_RESP');
      expect(result.data[0].result).toBe('Success');
    });

    it('should parse SET_COLOR_RESP failure', async () => {
      const fixture = V6800_COMMAND_RESP_FIXTURES[1];

      const rawMessage: RawMQTTMessage = {
        topic: fixture.topic,
        payload: Buffer.from(JSON.stringify(fixture.rawJson)),
        qos: 1,
        retain: false,
        timestamp: new Date(),
      };

      const result = (await parser.parse(rawMessage)) as V6800SetColorRespSIF;

      expect(result).toBeDefined();
      expect(result.data[0].result).toBe('Failure');
    });

    it('should parse QUERY_COLOR_RESP', async () => {
      const fixture = V6800_COMMAND_RESP_FIXTURES[2];

      const rawMessage: RawMQTTMessage = {
        topic: fixture.topic,
        payload: Buffer.from(JSON.stringify(fixture.rawJson)),
        qos: 1,
        retain: false,
        timestamp: new Date(),
      };

      const result = (await parser.parse(rawMessage)) as V6800QueryColorRespSIF;

      expect(result).toBeDefined();
      expect(result.deviceType).toBe('V6800');
      expect(result.messageType).toBe('QUERY_COLOR_RESP');
      expect(result.data[0].data).toHaveLength(3);
      expect(result.data[0].data[0].colorName).toBe('RED');
      expect(result.data[0].data[0].colorCode).toBe(1);
    });

    it('should parse CLEAR_ALARM_RESP success', async () => {
      const fixture = V6800_COMMAND_RESP_FIXTURES[3];

      const rawMessage: RawMQTTMessage = {
        topic: fixture.topic,
        payload: Buffer.from(JSON.stringify(fixture.rawJson)),
        qos: 1,
        retain: false,
        timestamp: new Date(),
      };

      const result = (await parser.parse(rawMessage)) as V6800ClearAlarmRespSIF;

      expect(result).toBeDefined();
      expect(result.deviceType).toBe('V6800');
      expect(result.messageType).toBe('CLEAR_ALARM_RESP');
      expect(result.data[0].result).toBe('Success');
    });

    it('should parse CLEAR_ALARM_RESP failure', async () => {
      const fixture = V6800_COMMAND_RESP_FIXTURES[4];

      const rawMessage: RawMQTTMessage = {
        topic: fixture.topic,
        payload: Buffer.from(JSON.stringify(fixture.rawJson)),
        qos: 1,
        retain: false,
        timestamp: new Date(),
      };

      const result = (await parser.parse(rawMessage)) as V6800ClearAlarmRespSIF;

      expect(result).toBeDefined();
      expect(result.data[0].result).toBe('Failure');
    });
  });
});
