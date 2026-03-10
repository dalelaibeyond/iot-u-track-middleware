/**
 * V5008 Parser Tests
 * 
 * Test-Driven Development (TDD) for V5008 binary protocol parser
 * These tests define the expected behavior and will initially fail
 */

import { V5008Parser } from '@core/parser/v5008-parser';
import { V5008_HEARTBEAT_FIXTURES } from '@fixtures/v5008/heartbeat.fixtures';
import { RawMQTTMessage } from '@core/parser/parser.interface';
import { V5008HeartbeatSIF } from '@t/index';

describe('V5008 Parser', () => {
  let parser: V5008Parser;

  beforeEach(() => {
    parser = new V5008Parser();
  });

  describe('Device Type Support', () => {
    it('should support V5008 device type', () => {
      expect(parser.supports('V5008')).toBe(true);
    });

    it('should not support V6800 device type', () => {
      expect(parser.supports('V6800')).toBe(false);
    });

    it('should not support unknown device types', () => {
      expect(parser.supports('UNKNOWN')).toBe(false);
      expect(parser.supports('')).toBe(false);
    });
  });

  describe('HEARTBEAT Message Parsing', () => {
    it('should parse single module HEARTBEAT message', async () => {
      const fixture = V5008_HEARTBEAT_FIXTURES[0]; // Single module
      
      const rawMessage: RawMQTTMessage = {
        topic: fixture.topic,
        payload: fixture.rawBuffer,
        qos: 1,
        retain: false,
        timestamp: new Date(),
      };

      const result = (await parser.parse(rawMessage)) as V5008HeartbeatSIF;

      expect(result).toBeDefined();
      expect(result.deviceType).toBe('V5008');
      expect(result.messageType).toBe('HEARTBEAT');
      expect(result.deviceId).toBe(fixture.expected.deviceId);
      expect(result.messageId).toBe(fixture.expected.messageId);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual({
        moduleIndex: fixture.expected.modules[0].moduleIndex,
        moduleId: fixture.expected.modules[0].moduleId,
        uTotal: fixture.expected.modules[0].uTotal,
      });
    });

    it('should parse boot HEARTBEAT message (0xCB header)', async () => {
      const fixture = V5008_HEARTBEAT_FIXTURES[1]; // Boot notification
      
      const rawMessage: RawMQTTMessage = {
        topic: fixture.topic,
        payload: fixture.rawBuffer,
        qos: 1,
        retain: false,
        timestamp: new Date(),
      };

      const result = (await parser.parse(rawMessage)) as V5008HeartbeatSIF;

      expect(result).toBeDefined();
      expect(result.messageType).toBe('HEARTBEAT');
      expect(result.data).toHaveLength(1);
    });

    it('should parse multiple modules HEARTBEAT message', async () => {
      const fixture = V5008_HEARTBEAT_FIXTURES[2]; // Multiple modules
      
      const rawMessage: RawMQTTMessage = {
        topic: fixture.topic,
        payload: fixture.rawBuffer,
        qos: 1,
        retain: false,
        timestamp: new Date(),
      };

      const result = (await parser.parse(rawMessage)) as V5008HeartbeatSIF;

      expect(result).toBeDefined();
      expect(result.data).toHaveLength(3);
      expect(result.data[0].moduleIndex).toBe(1);
      expect(result.data[1].moduleIndex).toBe(2);
      expect(result.data[2].moduleIndex).toBe(3);
    });

    it('should filter out empty module slots', async () => {
      // Fixture with only 1 module but 10 slots in buffer
      const fixture = V5008_HEARTBEAT_FIXTURES[0];
      
      const rawMessage: RawMQTTMessage = {
        topic: fixture.topic,
        payload: fixture.rawBuffer,
        qos: 1,
        retain: false,
        timestamp: new Date(),
      };

      const result = (await parser.parse(rawMessage)) as V5008HeartbeatSIF;

      // Should only return the 1 module that's online
      expect(result.data).toHaveLength(1);
    });

    it('should filter out modules with invalid ModAddr (>5)', async () => {
      // Modules with ModAddr > 5 should be filtered per spec
      const fixture = V5008_HEARTBEAT_FIXTURES[0];
      
      const rawMessage: RawMQTTMessage = {
        topic: fixture.topic,
        payload: fixture.rawBuffer,
        qos: 1,
        retain: false,
        timestamp: new Date(),
      };

      const result = (await parser.parse(rawMessage)) as V5008HeartbeatSIF;

      // All returned modules should have moduleIndex <= 5
      result.data.forEach((module: any) => {
        expect(module.moduleIndex).toBeLessThanOrEqual(5);
      });
    });
  });

  describe('Error Handling', () => {
    it('should throw error for truncated message', async () => {
      const rawMessage: RawMQTTMessage = {
        topic: 'V5008Upload/123/OpeAck',
        payload: Buffer.from([0xCC, 0x01]), // Truncated - only 2 bytes
        qos: 1,
        retain: false,
        timestamp: new Date(),
      };

      await expect(parser.parse(rawMessage)).rejects.toThrow();
    });

    it('should throw error for unknown header', async () => {
      const rawMessage: RawMQTTMessage = {
        topic: 'V5008Upload/123/OpeAck',
        payload: Buffer.from([0xFF, 0x00, 0x00, 0x00, 0x00]), // Unknown header
        qos: 1,
        retain: false,
        timestamp: new Date(),
      };

      await expect(parser.parse(rawMessage)).rejects.toThrow();
    });

    it('should throw error for invalid topic format', async () => {
      const rawMessage: RawMQTTMessage = {
        topic: 'InvalidTopic/123',
        payload: Buffer.from([0xCC]),
        qos: 1,
        retain: false,
        timestamp: new Date(),
      };

      await expect(parser.parse(rawMessage)).rejects.toThrow();
    });
  });

  describe('Metadata Parsing', () => {
    it('should extract device ID from topic', async () => {
      const fixture = V5008_HEARTBEAT_FIXTURES[0];
      
      const rawMessage: RawMQTTMessage = {
        topic: fixture.topic,
        payload: fixture.rawBuffer,
        qos: 1,
        retain: false,
        timestamp: new Date(),
      };

      const result = (await parser.parse(rawMessage)) as V5008HeartbeatSIF;

      expect(result.deviceId).toBe('2437871205');
      expect(result.meta.topic).toBe(fixture.topic);
      expect(result.meta.rawHex).toBeDefined();
    });

    it('should convert message ID using Algorithm D', async () => {
      const fixture = V5008_HEARTBEAT_FIXTURES[0];
      
      const rawMessage: RawMQTTMessage = {
        topic: fixture.topic,
        payload: fixture.rawBuffer,
        qos: 1,
        retain: false,
        timestamp: new Date(),
      };

      const result = (await parser.parse(rawMessage)) as V5008HeartbeatSIF;

      // Algorithm D: read as unsigned 32-bit big-endian, convert to string
      // Last 4 bytes: 0x00 0x00 0x27 0x10 = 10000
      expect(result.messageId).toBe('10000');
    });
  });
});
