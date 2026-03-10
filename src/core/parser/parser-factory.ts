/**
 * Parser Factory
 *
 * Factory for creating appropriate parser based on topic/device type
 */

import { IMessageParser } from './parser.interface';
import { V5008Parser } from './v5008-parser';
import { V6800Parser } from './v6800-parser';
import { detectDeviceType } from './parser.interface';

export class ParserFactory {
  private static parsers: Map<string, IMessageParser> = new Map();

  static getParser(topic: string): IMessageParser {
    const deviceType = detectDeviceType(topic);

    if (!deviceType) {
      throw new Error(`Cannot determine device type from topic: ${topic}`);
    }

    // Return cached parser instance (singleton per device type)
    if (!ParserFactory.parsers.has(deviceType)) {
      if (deviceType === 'V5008') {
        ParserFactory.parsers.set(deviceType, new V5008Parser());
      } else if (deviceType === 'V6800') {
        ParserFactory.parsers.set(deviceType, new V6800Parser());
      }
    }

    return ParserFactory.parsers.get(deviceType)!;
  }
}
