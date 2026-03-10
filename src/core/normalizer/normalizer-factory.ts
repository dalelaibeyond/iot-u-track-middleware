/**
 * Normalizer Factory
 *
 * Factory for creating and managing normalizer instances
 */

import { INormalizer } from './normalizer.interface';
import { V6800Normalizer } from './v6800-normalizer';
import { V5008Normalizer } from './v5008-normalizer';
import { SIFMessage } from '../../types/sif.types';

/**
 * Normalizer Factory
 * Provides normalizer instances based on device type
 */
export class NormalizerFactory {
  private static _v6800Normalizer: V6800Normalizer | null = null;
  private static _v5008Normalizer: V5008Normalizer | null = null;

  /**
   * Get the appropriate normalizer for a SIF message
   * @param sifMessage - The SIF message to normalize
   * @returns The appropriate normalizer instance
   * @throws Error if device type is not supported
   */
  static getNormalizer(sifMessage: Pick<SIFMessage, 'deviceType'>): INormalizer {
    const deviceType = sifMessage.deviceType;

    if (deviceType === 'V6800') {
      if (!this._v6800Normalizer) {
        this._v6800Normalizer = new V6800Normalizer();
      }
      return this._v6800Normalizer;
    }

    if (deviceType === 'V5008') {
      if (!this._v5008Normalizer) {
        this._v5008Normalizer = new V5008Normalizer();
      }
      return this._v5008Normalizer;
    }

    throw new Error(`No normalizer available for device type: ${deviceType}`);
  }

  /**
   * Normalize a SIF message using the appropriate normalizer
   * Convenience method that gets the normalizer and applies it
   * @param sifMessage - The SIF message to normalize
   * @returns Promise resolving to SUO message(s)
   */
  static async normalize(sifMessage: SIFMessage) {
    const normalizer = this.getNormalizer(sifMessage);
    return normalizer.normalize(sifMessage);
  }

  /**
   * Reset all cached normalizer instances
   * Useful for testing
   */
  static reset(): void {
    this._v6800Normalizer = null;
    this._v5008Normalizer = null;
  }
}
