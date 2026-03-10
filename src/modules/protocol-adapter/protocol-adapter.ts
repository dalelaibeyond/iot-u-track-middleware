/**
 * Protocol Adapter Module
 *
 * Aligns device-specific behaviors between V5008 and V6800 devices.
 * First feature: RFID Event Unification - both devices emit identical SUO_RFID_EVENT.
 *
 * Architecture:
 * - Subscribes to SUO_MQTT_MESSAGE events (RFID_SNAPSHOT, RFID_EVENT)
 * - Routes messages to RFIDUnifier based on device type
 * - Calls stopPropagation for processed messages to prevent duplicate processing
 */

import { eventBus, SystemEvents } from '../../core/event-bus';
import { Logger } from '../../utils/logger';
import { IUOSCache } from '../../types/uos.types';
import { SUOMessageEvent } from '../../types/event.types';
import {
  SUORfidSnapshot,
  SUORfidEvent,
  isSUORfidSnapshot,
  isSUORfidEvent,
} from '../../types/suo.types';
import { RFIDUnifier, RFIDUnifierConfig } from './rfid-unifier';

export interface ProtocolAdapterConfig {
  enabled: boolean;
  dedupWindowMs: number; // Deduplication window in milliseconds
}

export interface ProtocolAdapter {
  start(): void;
  stop(): void;
  isActive(): boolean;
  getConfig(): ProtocolAdapterConfig;
  updateConfig(config: Partial<ProtocolAdapterConfig>): void;
}

/**
 * Protocol Adapter Module Implementation
 *
 * Handles RFID event unification between V5008 and V6800 devices.
 * V5008: RFID_SNAPSHOT → compare → emit SUO_RFID_EVENT
 * V6800: RFID_EVENT → query snapshot → when response → compare → emit SUO_RFID_EVENT
 */
export class ProtocolAdapterModule implements ProtocolAdapter {
  private config: ProtocolAdapterConfig;
  private logger: Logger;
  private cache: IUOSCache;
  private isRunning: boolean = false;
  private rfidUnifier: RFIDUnifier;
  private boundHandleSUOMessage: (event: SUOMessageEvent) => void;

  constructor(config: ProtocolAdapterConfig, cache: IUOSCache) {
    this.config = config;
    this.logger = new Logger('ProtocolAdapter');
    this.cache = cache;

    // Initialize RFID Unifier
    const rfidConfig: RFIDUnifierConfig = {
      dedupWindowMs: config.dedupWindowMs,
    };
    this.rfidUnifier = new RFIDUnifier(rfidConfig, cache);

    this.boundHandleSUOMessage = this.handleSUOMessage.bind(this);
  }

  /**
   * Start the Protocol Adapter module
   */
  start(): void {
    if (this.isRunning) {
      this.logger.warn('ProtocolAdapter is already running');
      return;
    }

    if (!this.config.enabled) {
      this.logger.info('ProtocolAdapter is disabled');
      return;
    }

    this.logger.info('Starting ProtocolAdapter module...');

    // Subscribe to SUO_MQTT_MESSAGE events
    eventBus.on<SUOMessageEvent>(SystemEvents.SUO_MQTT_MESSAGE, this.boundHandleSUOMessage);

    this.isRunning = true;
    this.logger.info('ProtocolAdapter module started');
  }

  /**
   * Stop the Protocol Adapter module
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('Stopping ProtocolAdapter module...');

    // Unsubscribe from events
    eventBus.off<SUOMessageEvent>(SystemEvents.SUO_MQTT_MESSAGE, this.boundHandleSUOMessage);

    this.isRunning = false;
    this.logger.info('ProtocolAdapter module stopped');
  }

  /**
   * Handle SUO_MQTT_MESSAGE events
   * Routes RFID_SNAPSHOT and RFID_EVENT messages to RFIDUnifier
   */
  private handleSUOMessage(event: SUOMessageEvent): void {
    try {
      const message = event.message;

      // Handle RFID_SNAPSHOT messages (from both V5008 and V6800)
      if (isSUORfidSnapshot(message)) {
        this.handleRfidSnapshot(message);
        return;
      }

      // Handle RFID_EVENT messages (from V6800 only)
      if (isSUORfidEvent(message)) {
        this.handleRfidEvent(message);
        return;
      }
    } catch (error) {
      this.logger.error('Error handling SUO message', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Handle RFID_SNAPSHOT message
   * Routes to appropriate handler based on device type
   */
  private handleRfidSnapshot(snapshot: SUORfidSnapshot): void {
    this.logger.debug('Processing RFID_SNAPSHOT', {
      deviceId: snapshot.deviceId,
      deviceType: snapshot.deviceType,
      moduleIndex: snapshot.moduleIndex,
    });

    if (snapshot.deviceType === 'V5008') {
      this.rfidUnifier.processV5008Snapshot(snapshot);
    } else if (snapshot.deviceType === 'V6800') {
      this.rfidUnifier.processV6800Snapshot(snapshot);
    } else {
      this.logger.warn('Unknown device type for RFID_SNAPSHOT', {
        deviceId: snapshot.deviceId,
        deviceType: snapshot.deviceType,
      });
    }
  }

  /**
   * Handle RFID_EVENT message (V6800 only)
   * Triggers snapshot query for unified event emission
   */
  private handleRfidEvent(event: SUORfidEvent): void {
    this.logger.debug('Processing RFID_EVENT', {
      deviceId: event.deviceId,
      deviceType: event.deviceType,
      moduleIndex: event.moduleIndex,
    });

    if (event.deviceType === 'V6800') {
      this.rfidUnifier.processV6800Event(event);
    } else {
      // V5008 shouldn't send RFID_EVENT, but handle gracefully
      this.logger.warn('Received RFID_EVENT from non-V6800 device', {
        deviceId: event.deviceId,
        deviceType: event.deviceType,
      });
    }
  }

  /**
   * Check if module is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get current configuration
   */
  getConfig(): ProtocolAdapterConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ProtocolAdapterConfig>): void {
    this.config = { ...this.config, ...config };

    // Update RFID Unifier config in-place to preserve state
    if (config.dedupWindowMs !== undefined) {
      this.rfidUnifier.updateConfig({ dedupWindowMs: config.dedupWindowMs });
    }

    this.logger.info('ProtocolAdapter configuration updated', { config: this.config });
  }

  /**
   * Get RFID Unifier instance (for testing)
   */
  getRfidUnifier(): RFIDUnifier {
    return this.rfidUnifier;
  }
}
