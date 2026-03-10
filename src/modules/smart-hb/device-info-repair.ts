/**
 * Device Info Repair
 *
 * Builds complete SUO_DEV_MOD from partial updates (DEVICE_INFO, MODULE_INFO, HEARTBEAT).
 * Tracks device info completion status and queries missing information.
 */

import { eventBus, SystemEvents } from '../../core/event-bus';
import { Logger } from '../../utils/logger';
import { UOSCache } from '../cache';
import {
  SUODevMod,
  checkDeviceInfoCompletion,
  mergeSUODevMod,
  DeviceInfoCompletionStatus,
} from '../../types/suo.types';
import { CommandPublishEvent } from '../../types/event.types';
import { DeviceMetadata } from '../../types/uos.types';

export interface DeviceInfoRepairConfig {
  queryCooldown: number; // Milliseconds between queries for same device/query type
  enableRepair: boolean;
}

/**
 * Tracks the repair state for a specific device
 */
interface DeviceRepairState {
  deviceId: string;
  deviceType: 'V5008' | 'V6800';
  partialDevMod: SUODevMod | null;
  isComplete: boolean;
  lastQueryTime: Map<string, number>; // queryType -> timestamp
}

/**
 * Device Info Repair Helper
 *
 * Responsibilities:
 * - Merge partial SUO_DEV_MOD updates into accumulated state
 * - Check completion status after each update
 * - Query missing device/module info when needed
 * - Emit SUO_MQTT_MESSAGE when device info becomes complete
 * - Track cooldown to prevent duplicate queries
 */
export class DeviceInfoRepair {
  private config: DeviceInfoRepairConfig;
  private logger: Logger;
  private cache: UOSCache;
  private deviceStates: Map<string, DeviceRepairState>;
  private commandCounter: number = 0;

  constructor(config: DeviceInfoRepairConfig, cache: UOSCache) {
    this.config = config;
    this.logger = new Logger('DeviceInfoRepair');
    this.cache = cache;
    this.deviceStates = new Map();
  }

  /**
   * Process a SUO_DEV_MOD message
   * Merges into cache, checks completion, queries missing info if needed
   */
  processDevMod(message: SUODevMod): void {
    try {
      if (!this.config.enableRepair) {
        return;
      }

      const { deviceId, deviceType } = message;

      this.logger.debug('Processing SUO_DEV_MOD', { deviceId, deviceType });

      // Get or create device repair state
      const state = this.getOrCreateDeviceState(deviceId, deviceType);

      // Merge the incoming message with existing partial data
      if (state.partialDevMod) {
        state.partialDevMod = mergeSUODevMod(state.partialDevMod, message);
      } else {
        state.partialDevMod = { ...message };
      }

      // Check completion status
      const completionStatus = checkDeviceInfoCompletion(state.partialDevMod);

      // Update cache with merged device info
      this.updateCacheFromDevMod(state.partialDevMod);

      if (completionStatus.isComplete) {
        // Device info is complete
        if (!state.isComplete) {
          // First time complete - emit SUO_MQTT_MESSAGE
          state.isComplete = true;
          this.emitCompleteDevMod(state.partialDevMod);
          this.logger.info('Device info complete', { deviceId });
        }
      } else {
        // Device info incomplete - query missing data
        state.isComplete = false;
        this.queryMissingInfo(deviceId, deviceType, completionStatus);
      }
    } catch (error) {
      this.logger.error('Error processing SUO_DEV_MOD message', {
        error: error instanceof Error ? error.message : String(error),
        deviceId: message.deviceId,
      });
    }
  }

  /**
   * Process heartbeat message
   * Converts HEARTBEAT modules to partial DevMod and processes
   */
  processHeartbeat(
    deviceId: string,
    deviceType: 'V5008' | 'V6800',
    modules: Array<{ moduleIndex: number; moduleId: string; uTotal: number }>
  ): void {
    if (!this.config.enableRepair) {
      return;
    }

    this.logger.debug('Processing heartbeat for repair', { deviceId, moduleCount: modules.length });

    // Convert heartbeat modules to partial SUO_DEV_MOD (flattened structure)
    const partialDevMod: SUODevMod = {
      suoType: 'SUO_DEV_MOD',
      deviceId,
      deviceType,
      serverTimestamp: new Date().toISOString(),
      deviceTimestamp: null,
      messageId: `hb-repair-${Date.now()}`,
      ip: null,
      mask: null,
      gwIp: null,
      mac: null,
      model: null,
      fwVer: null,
      modules: modules.map(m => ({
        moduleIndex: m.moduleIndex,
        moduleId: m.moduleId,
        fwVer: '',
        uTotal: m.uTotal,
      })),
    };

    this.processDevMod(partialDevMod);
  }

  /**
   * Check if device info is complete for a given device
   */
  isDeviceInfoComplete(deviceId: string): boolean {
    const state = this.deviceStates.get(deviceId);
    return state?.isComplete ?? false;
  }

  /**
   * Get the current repair state for a device
   */
  getDeviceState(deviceId: string): DeviceRepairState | undefined {
    return this.deviceStates.get(deviceId);
  }

  /**
   * Clear all repair states (for testing or cleanup)
   */
  clear(): void {
    this.deviceStates.clear();
    this.logger.info('All device repair states cleared');
  }

  /**
   * Get or create device repair state
   */
  private getOrCreateDeviceState(
    deviceId: string,
    deviceType: 'V5008' | 'V6800'
  ): DeviceRepairState {
    let state = this.deviceStates.get(deviceId);

    if (!state) {
      state = {
        deviceId,
        deviceType,
        partialDevMod: null,
        isComplete: false,
        lastQueryTime: new Map(),
      };
      this.deviceStates.set(deviceId, state);
    }

    return state;
  }

  /**
   * Update cache from DevMod data
   */
  private updateCacheFromDevMod(devMod: SUODevMod): void {
    const { deviceId, deviceType } = devMod;

    // Build partial device metadata
    const partialMetadata: Partial<DeviceMetadata> = {
      deviceId,
      deviceType,
    };

    // Add non-null device-level fields (flattened structure)
    if (devMod.ip) partialMetadata.ip = devMod.ip;
    if (devMod.mac) partialMetadata.mac = devMod.mac;
    if (devMod.fwVer) partialMetadata.fwVer = devMod.fwVer;
    if (devMod.mask) partialMetadata.mask = devMod.mask;
    if (devMod.gwIp) partialMetadata.gwIp = devMod.gwIp;

    // Add module info
    if (devMod.modules.length > 0) {
      partialMetadata.activeModules = devMod.modules.map(m => ({
        moduleIndex: m.moduleIndex,
        moduleId: m.moduleId,
        fwVer: m.fwVer || undefined,
        uTotal: m.uTotal,
      }));
    }

    // Merge with cache
    this.cache.mergeDeviceInfo(deviceId, partialMetadata);
  }

  /**
   * Query missing device/module info based on completion status
   */
  private queryMissingInfo(
    deviceId: string,
    deviceType: 'V5008' | 'V6800',
    completionStatus: DeviceInfoCompletionStatus
  ): void {
    const state = this.deviceStates.get(deviceId);
    if (!state) return;

    // Check if we need device-level info
    const needsDeviceInfo = completionStatus.missingFields.some(field =>
      ['ip', 'mac', 'fwVer', 'mask', 'gwIp'].includes(field)
    );

    if (needsDeviceInfo) {
      this.queryDeviceInfo(deviceId, deviceType, state);
    }

    // Check if we need module info
    if (completionStatus.missingModuleFields.length > 0) {
      for (const moduleStatus of completionStatus.missingModuleFields) {
        this.queryModuleInfo(deviceId, deviceType, moduleStatus.moduleIndex, state);
      }
    }
  }

  /**
   * Query device info from the device
   */
  private queryDeviceInfo(
    deviceId: string,
    deviceType: 'V5008' | 'V6800',
    state: DeviceRepairState
  ): void {
    const queryType = 'device_info';

    if (!this.canQuery(state, queryType)) {
      this.logger.debug('Skipping device info query (cooldown)', { deviceId });
      return;
    }

    this.logger.info('Querying device info', { deviceId, deviceType });

    let topic: string;
    let payload: Buffer;

    if (deviceType === 'V5008') {
      // V5008: Query device info command (0xEF01)
      topic = `V5008Download/${deviceId}`;
      payload = Buffer.from([0xef, 0x01]);
    } else {
      // V6800: Query device info via JSON
      topic = `V6800Download/${deviceId}`;
      payload = Buffer.from(
        JSON.stringify({
          msg_type: 'get_device_info_req',
          msg_code: 200,
        })
      );
    }

    this.publishCommand(topic, payload);
    this.recordQuery(state, queryType);
  }

  /**
   * Query module info from the device
   */
  private queryModuleInfo(
    deviceId: string,
    deviceType: 'V5008' | 'V6800',
    moduleIndex: number,
    state: DeviceRepairState
  ): void {
    const queryType = `module_info_${moduleIndex}`;

    if (!this.canQuery(state, queryType)) {
      this.logger.debug('Skipping module info query (cooldown)', { deviceId, moduleIndex });
      return;
    }

    this.logger.info('Querying module info', { deviceId, deviceType, moduleIndex });

    let topic: string;
    let payload: Buffer;

    if (deviceType === 'V5008') {
      // V5008: Query module info command (0xEF02)
      topic = `V5008Download/${deviceId}`;
      payload = Buffer.from([0xef, 0x02, moduleIndex]);
    } else {
      // V6800: Query module info via JSON
      topic = `V6800Download/${deviceId}`;
      payload = Buffer.from(
        JSON.stringify({
          msg_type: 'get_module_info_req',
          msg_code: 200,
          module_index: moduleIndex,
        })
      );
    }

    this.publishCommand(topic, payload);
    this.recordQuery(state, queryType);
  }

  /**
   * Publish command to event bus
   */
  private publishCommand(topic: string, payload: Buffer): void {
    this.commandCounter += 1;
    const commandEvent: CommandPublishEvent = {
      commandId: `repair-query-${Date.now()}-${this.commandCounter}`,
      topic,
      payload,
      qos: 1,
      timestamp: new Date(),
    };

    eventBus.emit<CommandPublishEvent>(SystemEvents.COMMAND_PUBLISH, commandEvent);
  }

  /**
   * Check if we can query (cooldown check)
   */
  private canQuery(state: DeviceRepairState, queryType: string): boolean {
    const lastQuery = state.lastQueryTime.get(queryType);

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
  private recordQuery(state: DeviceRepairState, queryType: string): void {
    state.lastQueryTime.set(queryType, Date.now());

    // Cleanup old entries periodically
    if (state.lastQueryTime.size > 100) {
      this.cleanupOldQueries(state);
    }
  }

  /**
   * Cleanup old query records (older than 1 hour)
   */
  private cleanupOldQueries(state: DeviceRepairState): void {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour

    for (const [queryType, timestamp] of state.lastQueryTime.entries()) {
      if (now - timestamp > maxAge) {
        state.lastQueryTime.delete(queryType);
      }
    }
  }

  /**
   * Emit SUO_MQTT_MESSAGE when device info is complete
   */
  private emitCompleteDevMod(devMod: SUODevMod): void {
    const event: { message: SUODevMod; sif?: null } = {
      message: devMod,
      sif: undefined, // No original SIF for aggregated message
    };

    eventBus.emit(SystemEvents.SUO_MQTT_MESSAGE, event);
    this.logger.debug('Emitted complete SUO_DEV_MOD', { deviceId: devMod.deviceId });
  }
}
