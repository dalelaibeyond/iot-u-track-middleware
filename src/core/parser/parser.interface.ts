/**
 * Parser Interface
 * 
 * Defines the contract for message parsers.
 * All parsers (V5008, V6800) must implement this interface.
 */

import { SIFMessage } from '../../types/index';

/**
 * Raw MQTT Message as received from broker
 */
export interface RawMQTTMessage {
  topic: string;
  payload: Buffer;
  qos: number;
  retain: boolean;
  timestamp: Date;
}

/**
 * Parser interface - all message parsers implement this
 */
export interface IMessageParser {
  /**
   * Parse a raw MQTT message into SIF format
   * @param rawMessage - The raw MQTT message
   * @returns Promise resolving to SIF message(s)
   * @throws ParserError if parsing fails
   */
  parse(rawMessage: RawMQTTMessage): Promise<SIFMessage | SIFMessage[]>;

  /**
   * Check if this parser supports the given device type
   * @param deviceType - The device type string
   * @returns true if supported
   */
  supports(deviceType: string): boolean;

  /**
   * Get the parser name/identifier
   */
  readonly name: string;
}

/**
 * Parser error class
 */
export class ParserError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ParserError';
  }
}

/**
 * Device type detection
 */
export function detectDeviceType(topic: string): 'V5008' | 'V6800' | null {
  if (topic.startsWith('V5008Upload/') || topic.startsWith('V5008Download/')) {
    return 'V5008';
  }
  if (topic.startsWith('V6800Upload/') || topic.startsWith('V6800Download/')) {
    return 'V6800';
  }
  return null;
}

/**
 * Extract device ID from topic
 */
export function extractDeviceId(topic: string): string | null {
  const match = topic.match(/V5008Upload\/(\d+)\//) || 
                topic.match(/V6800Upload\/(\d+)\//);
  return match ? match[1] : null;
}
