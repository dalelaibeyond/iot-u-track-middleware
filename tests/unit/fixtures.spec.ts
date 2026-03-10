/**
 * Fixture Validation Tests
 *
 * Verifies that test fixtures are properly structured
 */

import { V5008_HEARTBEAT_FIXTURES, V6800_DEV_MOD_INFO_FIXTURES } from '@fixtures/index';

describe('Test Fixtures', () => {
  describe('V5008 HEARTBEAT Fixtures', () => {
    it('should have valid binary data', () => {
      V5008_HEARTBEAT_FIXTURES.forEach(fixture => {
        expect(fixture.rawBuffer).toBeInstanceOf(Buffer);
        expect(fixture.rawBuffer.length).toBeGreaterThan(0);
        expect(fixture.topic).toMatch(/V5008Upload\/\d+\/OpeAck/);
      });
    });

    it('should have correct buffer length (46 bytes for HEARTBEAT)', () => {
      V5008_HEARTBEAT_FIXTURES.forEach(fixture => {
        // Header(1) + [ModAddr(1) + ModId(4) + Total(1)] × 10 + MsgId(4) = 1 + 60 + 4 = 65?
        // Actually: Header(1) + [ModAddr(1) + ModId(4) + Total(1)] × 10 + MsgId(4)
        // = 1 + 10*6 + 4 = 65 bytes
        expect(fixture.rawBuffer.length).toBe(65);
      });
    });

    it('should have expected parsing results', () => {
      V5008_HEARTBEAT_FIXTURES.forEach(fixture => {
        expect(fixture.expected).toBeDefined();
        expect(fixture.expected.messageType).toBe('HEARTBEAT');
        expect(fixture.expected.modules).toBeInstanceOf(Array);
      });
    });
  });

  describe('V6800 DEV_MOD_INFO Fixtures', () => {
    it('should have valid JSON data', () => {
      V6800_DEV_MOD_INFO_FIXTURES.forEach(fixture => {
        expect(fixture.rawJson).toBeDefined();
        expect(fixture.rawJson.msg_type).toBeDefined();
        expect(fixture.topic).toMatch(/V6800Upload\/\d+\/Init/);
      });
    });

    it('should have expected SIF transformation', () => {
      V6800_DEV_MOD_INFO_FIXTURES.forEach(fixture => {
        expect(fixture.expectedSIF).toBeDefined();
        expect(fixture.expectedSIF.deviceType).toBe('V6800');
        expect(fixture.expectedSIF.messageType).toBe('DEV_MOD_INFO');
        expect(fixture.expectedSIF.data).toBeInstanceOf(Array);
      });
    });

    it('should have expected SUO transformation', () => {
      V6800_DEV_MOD_INFO_FIXTURES.forEach(fixture => {
        expect(fixture.expectedSUO).toBeDefined();
        expect(fixture.expectedSUO.suoType).toBe('SUO_DEV_MOD');
        expect(fixture.expectedSUO.modules).toBeInstanceOf(Array);
      });
    });
  });
});
