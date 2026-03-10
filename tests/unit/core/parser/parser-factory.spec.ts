/**
 * Parser Factory Tests
 * 
 * Tests for parser selection and factory logic
 */

import { ParserFactory } from '@core/parser/parser-factory';
import { V5008Parser } from '@core/parser/v5008-parser';
import { V6800Parser } from '@core/parser/v6800-parser';
import { detectDeviceType, extractDeviceId } from '@core/parser/parser.interface';

describe('Parser Factory', () => {
  let factory: ParserFactory;

  beforeEach(() => {
    factory = new ParserFactory();
  });

  describe('Parser Selection', () => {
    it('should return V5008Parser for V5008Upload topics', () => {
      const parser = ParserFactory.getParser('V5008Upload/123/OpeAck');
      expect(parser).toBeInstanceOf(V5008Parser);
    });

    it('should return V5008Parser for V5008Download topics', () => {
      const parser = ParserFactory.getParser('V5008Download/123');
      expect(parser).toBeInstanceOf(V5008Parser);
    });

    it('should return V6800Parser for V6800Upload topics', () => {
      const parser = ParserFactory.getParser('V6800Upload/123/Init');
      expect(parser).toBeInstanceOf(V6800Parser);
    });

    it('should return V6800Parser for V6800Download topics', () => {
      const parser = ParserFactory.getParser('V6800Download/123');
      expect(parser).toBeInstanceOf(V6800Parser);
    });

    it('should throw error for unknown topic format', () => {
      expect(() => ParserFactory.getParser('UnknownTopic/123')).toThrow();
      expect(() => ParserFactory.getParser('')).toThrow();
    });

    it('should return same parser instance for same device type (singleton)', () => {
      const parser1 = ParserFactory.getParser('V5008Upload/1/OpeAck');
      const parser2 = ParserFactory.getParser('V5008Upload/2/OpeAck');
      
      // Should reuse the same parser instance
      expect(parser1).toBe(parser2);
    });
  });

  describe('Device Type Detection', () => {
    it('should detect V5008 from topic', () => {
      expect(detectDeviceType('V5008Upload/123/OpeAck')).toBe('V5008');
      expect(detectDeviceType('V5008Download/123')).toBe('V5008');
    });

    it('should detect V6800 from topic', () => {
      expect(detectDeviceType('V6800Upload/123/Init')).toBe('V6800');
      expect(detectDeviceType('V6800Download/123')).toBe('V6800');
    });

    it('should return null for unknown topics', () => {
      expect(detectDeviceType('OtherDevice/123')).toBeNull();
      expect(detectDeviceType('')).toBeNull();
      expect(detectDeviceType('invalid')).toBeNull();
    });
  });

  describe('Device ID Extraction', () => {
    it('should extract device ID from V5008Upload topic', () => {
      expect(extractDeviceId('V5008Upload/2437871205/OpeAck')).toBe('2437871205');
    });

    it('should extract device ID from V6800Upload topic', () => {
      expect(extractDeviceId('V6800Upload/2437871205/Init')).toBe('2437871205');
    });

    it('should return null for invalid topics', () => {
      expect(extractDeviceId('InvalidTopic')).toBeNull();
      expect(extractDeviceId('')).toBeNull();
    });
  });
});
