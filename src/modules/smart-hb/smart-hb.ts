/**
 * SmartHB Module
 *
 * Smart Heartbeat processing module with Device Info Repair
 * - Monitors heartbeat and device info messages
 * - Builds complete SUO_DEV_MOD from partial updates
 * - Queries device/module info if incomplete
 * - Implements cooldown to prevent spam
 */

import { eventBus, SystemEvents } from '../../core/event-bus';
import { Logger } from '../../utils/logger';
import { UOSCacheManager } from '../cache';
import { SUOMessageEvent, CommandPublishEvent } from '../../types/event.types';
import {
  SUOHeartbeat,
  SUODevMod,
  isSUODevMod,
  isSUOHeartbeat,
  checkDeviceInfoCompletion,
} from '../../types/suo.types';

import { DeviceInfoRepair, DeviceInfoRepairConfig } from './device-info-repair';

export interface SmartHBConfig {
  enabled: boolean;
  queryCooldown: number; // Milliseconds between queries
  triggerOnHeartbeat: boolean;
  enableDeviceInfoRepair: boolean; // Enable Device Info Repair feature
}

export class SmartHBModule {
  private config: SmartHBConfig;
  private logger: Logger;
  private cacheManager: UOSCacheManager;
  private isRunning: boolean = false;
  private lastQueryTime: Map<string, number> = new Map(); // deviceId:moduleIndex -> timestamp
  private deviceInfoRepair: DeviceInfoRepair;
  private boundHandleSUOMessage: (event: SUOMessageEvent) => void;

  constructor(config: SmartHBConfig, cacheManager: UOSCacheManager) {
    this.config = config;
    this.logger = new Logger('SmartHB');
    this.cacheManager = cacheManager;
    this.boundHandleSUOMessage = this.handleSUOMessage.bind(this);

    // Initialize Device Info Repair
    const repairConfig: DeviceInfoRepairConfig = {
      queryCooldown: config.queryCooldown,
      enableRepair: config.enableDeviceInfoRepair,
    };
    this.deviceInfoRepair = new DeviceInfoRepair(repairConfig, cacheManager.getCache());
  }

  /**
   * Start the SmartHB module
   */
  start(): void {
    if (this.isRunning) {
      this.logger.warn('SmartHB is already running');
      return;
    }

    if (!this.config.enabled) {
      this.logger.info('SmartHB is disabled');
      return;
    }

    this.logger.info('Starting SmartHB module...');

    // Subscribe to SUO messages with HIGH PRIORITY (runs before output modules)
    // This allows SmartHB to filter out incomplete SUO_DEV_MOD messages
    // @ts-ignore - onWithPriority is a custom method on EventBus
    eventBus.onWithPriority<SUOMessageEvent>(
      SystemEvents.SUO_MQTT_MESSAGE,
      this.boundHandleSUOMessage,
      100
    );

    this.isRunning = true;
    this.logger.info('SmartHB module started');
  }

  /**
   * Stop the SmartHB module
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('Stopping SmartHB module...');

    // Unsubscribe from events
    // @ts-ignore - offWithPriority is a custom method on EventBus
    eventBus.offWithPriority<SUOMessageEvent>(
      SystemEvents.SUO_MQTT_MESSAGE,
      this.boundHandleSUOMessage
    );

    this.isRunning = false;
    this.logger.info('SmartHB module stopped');
  }

  /**
   * Handle SUO messages (heartbeats and device info)
   */
  private handleSUOMessage(event: SUOMessageEvent): void {
    try {
      const message = event.message;

      // Handle SUO_DEV_MOD messages with Device Info Repair
      if (isSUODevMod(message)) {
        this.handleDevModMessage(message, event);
        return;
      }

      // Handle heartbeat messages
      if (isSUOHeartbeat(message) && this.config.triggerOnHeartbeat) {
        this.handleHeartbeatMessage(message);
      }
    } catch (error) {
      this.logger.error('Error handling SUO message', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Handle SUO_DEV_MOD message
   *
   * When SmartHB is enabled with device info repair:
   * - Incomplete SUO_DEV_MOD messages are filtered (stopPropagation)
   * - Only complete SUO_DEV_MOD messages are allowed to reach output modules
   * - DeviceInfoRepair will emit the complete message when ready
   */
  private handleDevModMessage(message: SUODevMod, event: SUOMessageEvent): void {
    this.logger.debug('Processing SUO_DEV_MOD', {
      deviceId: message.deviceId,
      deviceType: message.deviceType,
    });

    // Check if this message is complete
    const completionStatus = checkDeviceInfoCompletion(message);

    if (!completionStatus.isComplete && this.config.enableDeviceInfoRepair) {
      // Message is incomplete - filter it out and let DeviceInfoRepair handle it
      this.logger.debug('Filtering incomplete SUO_DEV_MOD', {
        deviceId: message.deviceId,
        missingFields: completionStatus.missingFields,
        missingModuleFields: completionStatus.missingModuleFields,
      });

      // Pass to Device Info Repair (it will query missing info and emit when complete)
      this.deviceInfoRepair.processDevMod(message);

      // Stop propagation to prevent output modules from receiving incomplete data
      if (event.stopPropagation) {
        event.stopPropagation();
        this.logger.debug('Stopped propagation of incomplete SUO_DEV_MOD', {
          deviceId: message.deviceId,
        });
      }
    } else {
      // Message is complete - allow it to propagate to output modules
      // Still pass to DeviceInfoRepair to update cache
      this.deviceInfoRepair.processDevMod(message);
      this.logger.debug('Allowing complete SUO_DEV_MOD to propagate', {
        deviceId: message.deviceId,
      });
    }
  }

  /**
   * Handle SUO_HEARTBEAT message
   */
  private handleHeartbeatMessage(heartbeat: SUOHeartbeat): void {
    this.logger.debug('Processing heartbeat', {
      deviceId: heartbeat.deviceId,
      deviceType: heartbeat.deviceType,
    });

    // Pass heartbeat module data to Device Info Repair
    this.deviceInfoRepair.processHeartbeat(
      heartbeat.deviceId,
      heartbeat.deviceType,
      heartbeat.modules
    );

    // Legacy: Process each module in the heartbeat for individual queries
    for (const module of heartbeat.modules) {
      this.processModuleHeartbeat(
        heartbeat.deviceId,
        heartbeat.deviceType,
        module.moduleIndex,
        module.moduleId
      );
    }
  }

  /**
   * Process a single module's heartbeat (legacy fallback)
   */
  private processModuleHeartbeat(
    deviceId: string,
    deviceType: 'V5008' | 'V6800',
    moduleIndex: number,
    moduleId: string
  ): void {
    // Check if we need to query device info
    const deviceInfo = this.cacheManager.getCache().getDeviceInfo(deviceId);

    if (!deviceInfo) {
      // Device info not cached, query it
      this.queryDeviceInfo(deviceId, deviceType);
    }

    // Check if we need to query module info
    const cachedModule = this.cacheManager.getCache().getModule(deviceId, moduleIndex);

    if (!cachedModule?.lastSeenHb) {
      // Module info not cached, query it
      this.queryModuleInfo(deviceId, deviceType, moduleIndex, moduleId);
    }
  }

  /**
   * Query device info
   */
  private queryDeviceInfo(deviceId: string, deviceType: 'V5008' | 'V6800'): void {
    const cacheKey = `query:${deviceId}:info`;

    if (!this.canQuery(cacheKey)) {
      this.logger.debug('Skipping device info query (cooldown)', { deviceId });
      return;
    }

    this.logger.info('Querying device info', { deviceId, deviceType });

    // Determine query command based on device type
    let topic: string;
    let payload: Buffer;

    if (deviceType === 'V5008') {
      // V5008: Query device info
      topic = `V5008Download/${deviceId}`;
      payload = Buffer.from([0xef, 0x01]); // Header for query device info
    } else {
      // V6800: Query device info
      topic = `V6800Download/${deviceId}`;
      payload = Buffer.from(
        JSON.stringify({
          msg_type: 'get_device_info_req',
          msg_code: 200,
        })
      );
    }

    // Publish query command
    const commandEvent: CommandPublishEvent = {
      commandId: `query-device-${Date.now()}`,
      topic,
      payload,
      qos: 1,
      timestamp: new Date(),
    };

    eventBus.emit<CommandPublishEvent>(SystemEvents.COMMAND_PUBLISH, commandEvent);
    this.recordQuery(cacheKey);
  }

  /**
   * Query module info
   */
  private queryModuleInfo(
    deviceId: string,
    deviceType: 'V5008' | 'V6800',
    moduleIndex: number,
    _moduleId: string
  ): void {
    const cacheKey = `query:${deviceId}:${moduleIndex}:info`;

    if (!this.canQuery(cacheKey)) {
      this.logger.debug('Skipping module info query (cooldown)', { deviceId, moduleIndex });
      return;
    }

    this.logger.info('Querying module info', { deviceId, moduleIndex, deviceType });

    // Determine query command based on device type
    let topic: string;
    let payload: Buffer;

    if (deviceType === 'V5008') {
      // V5008: Query module info
      topic = `V5008Download/${deviceId}`;
      payload = Buffer.from([0xef, 0x02]); // Header for query module info
    } else {
      // V6800: Query module info
      topic = `V6800Download/${deviceId}`;
      payload = Buffer.from(
        JSON.stringify({
          msg_type: 'get_module_info_req',
          msg_code: 200,
        })
      );
    }

    // Publish query command
    const commandEvent: CommandPublishEvent = {
      commandId: `query-module-${Date.now()}`,
      topic,
      payload,
      qos: 1,
      timestamp: new Date(),
    };

    eventBus.emit<CommandPublishEvent>(SystemEvents.COMMAND_PUBLISH, commandEvent);
    this.recordQuery(cacheKey);
  }

  /**
   * Check if we can query (cooldown check)
   */
  private canQuery(cacheKey: string): boolean {
    const lastQuery = this.lastQueryTime.get(cacheKey);

    if (!lastQuery) {
      return true;
    }

    const now = Date.now();
    const timeSinceLastQuery = now - lastQuery;

    return timeSinceLastQuery >= this.config.queryCooldown;
  }

  /**
   * Record that we made a query
   */
  private recordQuery(cacheKey: string): void {
    this.lastQueryTime.set(cacheKey, Date.now());

    // Cleanup old entries periodically
    if (this.lastQueryTime.size > 1000) {
      this.cleanupOldQueries();
    }
  }

  /**
   * Cleanup old query records (older than 1 hour)
   */
  private cleanupOldQueries(): void {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour

    for (const [key, timestamp] of this.lastQueryTime.entries()) {
      if (now - timestamp > maxAge) {
        this.lastQueryTime.delete(key);
      }
    }
  }

  /**
   * Check if module is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get cooldown configuration
   */
  getConfig(): SmartHBConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SmartHBConfig>): void {
    this.config = { ...this.config, ...config };

    // Clear old DeviceInfoRepair state to prevent memory leak, then create new instance
    this.deviceInfoRepair.clear();
    this.deviceInfoRepair = new DeviceInfoRepair(
      {
        queryCooldown: this.config.queryCooldown,
        enableRepair: this.config.enableDeviceInfoRepair,
      },
      this.cacheManager.getCache()
    );

    this.logger.info('SmartHB configuration updated', { config: this.config });
  }

  /**
   * Get Device Info Repair instance (for testing)
   */
  getDeviceInfoRepair(): DeviceInfoRepair {
    return this.deviceInfoRepair;
  }
}
