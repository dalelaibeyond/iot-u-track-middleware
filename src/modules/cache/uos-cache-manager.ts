/**
 * UOS Cache Manager
 *
 * Manages UOS cache updates from SUO messages
 * Integrates with EventBus to automatically update cache
 */

import { eventBus, SystemEvents } from '../../core/event-bus';
import { UOSCache } from './uos-cache';
import { Logger } from '../../utils/logger';
import { SUOMessageEvent } from '../../types/event.types';
import {
  AnySUOMessage,
  SUODevMod,
  SUOHeartbeat,
  SUORfidSnapshot,
  SUOTempHum,
  SUONoiseLevel,
  SUODoorState,
  isSUODevMod,
  isSUOHeartbeat,
  isSUORfidSnapshot,
  isSUOTempHum,
  isSUONoiseLevel,
  isSUODoorState,
} from '../../types/suo.types';
import { ModuleTelemetry, DeviceMetadata } from '../../types/uos.types';

export class UOSCacheManager {
  private cache: UOSCache;
  private logger: Logger;
  private isRunning: boolean = false;

  constructor(cache?: UOSCache) {
    this.cache = cache || new UOSCache();
    this.logger = new Logger('UOSCacheManager');
  }

  /**
   * Start the cache manager
   * Subscribe to SUO message events
   */
  start(): void {
    if (this.isRunning) {
      this.logger.warn('UOS Cache Manager is already running');
      return;
    }

    this.logger.info('Starting UOS Cache Manager...');

    // Subscribe to SUO messages
    eventBus.on<SUOMessageEvent>(SystemEvents.SUO_MQTT_MESSAGE, this.handleSUOMessage.bind(this));

    this.isRunning = true;
    this.logger.info('UOS Cache Manager started');
  }

  /**
   * Stop the cache manager
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('Stopping UOS Cache Manager...');

    // Unsubscribe from events
    eventBus.off<SUOMessageEvent>(SystemEvents.SUO_MQTT_MESSAGE, this.handleSUOMessage.bind(this));

    this.isRunning = false;
    this.logger.info('UOS Cache Manager stopped');
  }

  /**
   * Handle incoming SUO messages and update cache
   */
  private handleSUOMessage(event: SUOMessageEvent): void {
    try {
      const message = event.message;

      // Use type guards to check message type
      if (isSUODevMod(message)) {
        this.updateDeviceInfo(message);
        return;
      }

      if (isSUOHeartbeat(message)) {
        this.updateHeartbeat(message);
        return;
      }

      // For other message types that still use SUOMessage base
      this.logger.debug(`Processing SUO message: ${message.suoType}`, {
        deviceId: message.deviceId,
        moduleIndex: message.moduleIndex,
      });

      switch (message.suoType) {
        case 'SUO_RFID_SNAPSHOT':
          this.updateRfidSnapshot(message as SUORfidSnapshot);
          break;
        case 'SUO_TEMP_HUM':
          this.updateTempHum(message as SUOTempHum);
          break;
        case 'SUO_NOISE_LEVEL':
          this.updateNoiseLevel(message as SUONoiseLevel);
          break;
        case 'SUO_DOOR_STATE':
          this.updateDoorState(message as SUODoorState);
          break;
        case 'SUO_RFID_EVENT':
          // RFID events are transient, don't cache
          this.logger.debug('RFID_EVENT not cached (transient)');
          break;
        case 'SUO_COMMAND_RESULT':
          // Command results are transient, don't cache
          this.logger.debug('COMMAND_RESULT not cached (transient)');
          break;
        default:
          this.logger.warn(`Unknown SUO type: ${(message as AnySUOMessage).suoType}`);
      }
    } catch (error) {
      this.logger.error('Failed to process SUO message', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Update device metadata from SUO_DEV_MOD (flattened structure)
   */
  private updateDeviceInfo(message: SUODevMod): void {
    const deviceInfo: DeviceMetadata = {
      deviceId: message.deviceId,
      deviceType: message.deviceType,
      ip: message.ip || '',
      mac: message.mac || '',
      fwVer: message.fwVer ?? undefined,
      mask: message.mask ?? undefined,
      gwIp: message.gwIp ?? undefined,
      lastSeenInfo: message.serverTimestamp,
      activeModules: message.modules.map(m => ({
        moduleIndex: m.moduleIndex,
        moduleId: m.moduleId,
        fwVer: m.fwVer,
        uTotal: m.uTotal,
      })),
    };

    this.cache.setDeviceInfo(message.deviceId, deviceInfo);
    this.logger.debug(`Device info updated: ${message.deviceId}`);

    // Also update module info in each module's telemetry
    for (const module of message.modules) {
      this.initializeOrUpdateModule(
        message.deviceId,
        message.deviceType,
        module.moduleIndex,
        module.moduleId,
        {
          uTotal: module.uTotal,
        }
      );
    }
  }

  /**
   * Update module heartbeat status (flattened structure)
   */
  private updateHeartbeat(message: SUOHeartbeat): void {
    for (const module of message.modules) {
      this.initializeOrUpdateModule(
        message.deviceId,
        message.deviceType,
        module.moduleIndex,
        module.moduleId,
        {
          uTotal: module.uTotal,
          lastSeenHb: message.serverTimestamp,
          isOnline: true,
        }
      );
    }

    this.logger.debug(`Heartbeat updated for device: ${message.deviceId}`);
  }

  /**
   * Update RFID snapshot
   */
  private updateRfidSnapshot(message: SUORfidSnapshot): void {
    const moduleIndex = message.moduleIndex;
    const moduleId = message.moduleId;

    if (moduleIndex === null || !moduleId) {
      this.logger.warn('RFID_SNAPSHOT missing module info');
      return;
    }

    this.initializeOrUpdateModule(message.deviceId, message.deviceType, moduleIndex, moduleId, {
      rfidSnapshot: message.data.sensors.map(s => ({
        sensorIndex: s.sensorIndex,
        tagId: s.tagId,
        isAlarm: s.isAlarm,
      })),
      lastSeenRfid: message.serverTimestamp,
    });

    this.logger.debug(`RFID snapshot updated: ${message.deviceId}:${moduleIndex}`);
  }

  /**
   * Update temperature and humidity
   */
  private updateTempHum(message: SUOTempHum): void {
    const moduleIndex = message.moduleIndex;
    const moduleId = message.moduleId;

    if (moduleIndex === null || !moduleId) {
      this.logger.warn('TEMP_HUM missing module info');
      return;
    }

    this.initializeOrUpdateModule(message.deviceId, message.deviceType, moduleIndex, moduleId, {
      tempHum: message.data.sensors.map(s => ({
        sensorIndex: s.sensorIndex,
        temp: s.temp,
        hum: s.hum,
      })),
      lastSeenTh: message.serverTimestamp,
    });

    this.logger.debug(`Temp/Hum updated: ${message.deviceId}:${moduleIndex}`);
  }

  /**
   * Update noise level (V5008 only)
   */
  private updateNoiseLevel(message: SUONoiseLevel): void {
    const moduleIndex = message.moduleIndex;
    const moduleId = message.moduleId;

    if (moduleIndex === null || !moduleId) {
      this.logger.warn('NOISE_LEVEL missing module info');
      return;
    }

    this.initializeOrUpdateModule(message.deviceId, message.deviceType, moduleIndex, moduleId, {
      noiseLevel: message.data.sensors.map(s => ({
        sensorIndex: s.sensorIndex,
        noise: s.noise,
      })),
      lastSeenNs: message.serverTimestamp,
    });

    this.logger.debug(`Noise level updated: ${message.deviceId}:${moduleIndex}`);
  }

  /**
   * Update door state
   */
  private updateDoorState(message: SUODoorState): void {
    const moduleIndex = message.moduleIndex;
    const moduleId = message.moduleId;

    if (moduleIndex === null) {
      this.logger.warn('DOOR_STATE missing module index');
      return;
    }

    this.initializeOrUpdateModule(
      message.deviceId,
      message.deviceType,
      moduleIndex,
      moduleId || '',
      {
        door1State: message.door1State,
        door2State: message.door2State,
        lastSeenDoor: message.serverTimestamp,
      }
    );

    this.logger.debug(`Door state updated: ${message.deviceId}:${moduleIndex}`);
  }

  /**
   * Initialize or update module telemetry
   */
  private initializeOrUpdateModule(
    deviceId: string,
    deviceType: 'V5008' | 'V6800',
    moduleIndex: number,
    moduleId: string,
    updates: Partial<ModuleTelemetry>
  ): void {
    // Get existing state or create new
    let state = this.cache.getModule(deviceId, moduleIndex);

    if (!state) {
      // Initialize new module state
      state = {
        deviceId,
        deviceType,
        moduleIndex,
        moduleId,
        isOnline: false,
        lastSeenHb: null,
        uTotal: null,
        tempHum: [],
        lastSeenTh: null,
        noiseLevel: [],
        lastSeenNs: null,
        rfidSnapshot: [],
        lastSeenRfid: null,
        door1State: null,
        door2State: null,
        lastSeenDoor: null,
      };
    }

    // Apply updates
    const updatedState: ModuleTelemetry = {
      ...state,
      ...updates,
      // Ensure ID fields are not overwritten by partial updates
      deviceId,
      deviceType,
      moduleIndex,
      moduleId: updates.moduleId || moduleId || state.moduleId,
    };

    this.cache.setModule(deviceId, moduleIndex, updatedState);
  }

  /**
   * Get the underlying cache instance
   */
  getCache(): UOSCache {
    return this.cache;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return this.cache.getStats();
  }

  /**
   * Check if manager is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get all device IDs in cache
   */
  getAllDeviceIds(): string[] {
    return this.cache.getAllDeviceIds();
  }

  /**
   * Get device metadata
   */
  getDeviceInfo(deviceId: string): DeviceMetadata | null {
    return this.cache.getDeviceInfo(deviceId);
  }

  /**
   * Get all modules for a device
   */
  getDeviceModules(deviceId: string): ModuleTelemetry[] {
    return this.cache.getAllModules(deviceId);
  }
}

// Export singleton instance
export const uosCacheManager = new UOSCacheManager();
