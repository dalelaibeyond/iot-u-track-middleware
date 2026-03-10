/**
 * Normalizer Interface
 *
 * Defines the contract for SIF to SUO normalizers.
 * Normalizers transform parsed SIF messages into standardized SUO format.
 */

import { SIFMessage } from '../../types/sif.types';
import { AnySUOMessage } from '../../types/suo.types';

/**
 * Normalizer error class
 */
export class NormalizerError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'NormalizerError';
  }
}

/**
 * Normalizer interface - all SIF to SUO normalizers implement this
 */
export interface INormalizer {
  /**
   * Transform SIF message(s) to SUO format
   * @param sifMessage - The SIF message from parser
   * @returns Promise resolving to SUO message(s)
   * @throws NormalizerError if transformation fails
   */
  normalize(sifMessage: SIFMessage): Promise<AnySUOMessage | AnySUOMessage[]>;

  /**
   * Check if this normalizer supports the given SIF message
   * @param sifMessage - The SIF message to check
   * @returns true if supported
   */
  supports(sifMessage: SIFMessage): boolean;

  /**
   * Get the normalizer name/identifier
   */
  readonly name: string;
}

/**
 * Base normalizer with common utilities
 */
export abstract class BaseNormalizer implements INormalizer {
  abstract readonly name: string;

  abstract supports(sifMessage: SIFMessage): boolean;

  abstract normalize(sifMessage: SIFMessage): Promise<AnySUOMessage | AnySUOMessage[]>;

  /**
   * Generate server timestamp in MySQL-compatible format
   * MySQL DATETIME format: 'YYYY-MM-DD HH:MM:SS.mmm'
   */
  protected generateTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
  }

  /**
   * Create base SUO message fields from SIF
   */
  protected createBaseSUO<T extends AnySUOMessage['suoType']>(
    sifMessage: SIFMessage,
    suoType: T,
    moduleIndex: number | null,
    moduleId: string | null
  ) {
    return {
      suoType,
      deviceId: sifMessage.deviceId,
      deviceType: sifMessage.deviceType,
      moduleIndex,
      moduleId,
      serverTimestamp: this.generateTimestamp(),
      deviceTimestamp: null, // V5008/V6800 don't have device timestamps
      messageId: sifMessage.messageId,
    };
  }
}
