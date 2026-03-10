/**
 * RFID Unifier
 *
 * Unifies RFID event handling between V5008 and V6800 devices.
 * - V5008: Process RFID_SNAPSHOT directly and emit SUO_RFID_EVENT for changes
 * - V6800: Process RFID_EVENT, trigger snapshot query, then emit SUO_RFID_EVENT
 *
 * Uses UOS cache to store previous RFID state and detect ATTACHED/DETACHED changes.
 * Implements deduplication to prevent duplicate events within a time window.
 */

import { eventBus, SystemEvents } from '../../core/event-bus';
import { Logger } from '../../utils/logger';
import { IUOSCache, ModuleTelemetry } from '../../types/uos.types';
import { SUORfidSnapshot, SUORfidEvent } from '../../types/suo.types';
import { CommandPublishEvent } from '../../types/event.types';

export interface RFIDUnifierConfig {
  dedupWindowMs: number; // Deduplication window in milliseconds
}

export interface RFIDSensorState {
  sensorIndex: number;
  tagId: string | null;
  isAlarm: boolean;
}

export interface RFIDChangeEvent {
  deviceId: string;
  deviceType: 'V5008' | 'V6800';
  moduleIndex: number;
  moduleId: string;
  sensorIndex: number;
  tagId: string;
  action: 'ATTACHED' | 'DETACHED';
  isAlarm: boolean;
  timestamp: string;
}

/**
 * RFID Unifier
 * Handles unified RFID event processing across device types
 */
export class RFIDUnifier {
  private config: RFIDUnifierConfig;
  private logger: Logger;
  private cache: IUOSCache;
  private dedupWindow: Map<string, number>; // key -> timestamp
  private messageIdCounter: number = 0;
  private emitCallCount: number = 0;
  private readonly CLEANUP_INTERVAL = 100; // Cleanup every 100 emits

  constructor(config: RFIDUnifierConfig, cache: IUOSCache) {
    this.config = config;
    this.logger = new Logger('RFIDUnifier');
    this.cache = cache;
    this.dedupWindow = new Map();
  }

  /**
   * Update configuration in-place
   */
  updateConfig(config: Partial<RFIDUnifierConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.debug('RFIDUnifier configuration updated', { config: this.config });
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.dedupWindow.clear();
    this.logger.debug('RFIDUnifier disposed');
  }

  /**
   * Process RFID_SNAPSHOT from any device type
   * - Save snapshot to UOS cache
   * - Compare with previous state
   * - Emit SUO_RFID_EVENT for any changes (ATTACHED/DETACHED)
   */
  processRfidSnapshot(snapshot: SUORfidSnapshot): void {
    this.logger.debug('Processing RFID_SNAPSHOT', {
      deviceId: snapshot.deviceId,
      deviceType: snapshot.deviceType,
      moduleIndex: snapshot.moduleIndex,
    });

    const changes = this.processSnapshotAndDetectChanges(snapshot);

    // Emit events for each change
    for (const change of changes) {
      this.emitRFIDEvent(change);
    }
  }

  /**
   * Process V5008 RFID_SNAPSHOT - delegates to unified handler
   */
  processV5008Snapshot(snapshot: SUORfidSnapshot): void {
    this.processRfidSnapshot(snapshot);
  }

  /**
   * Process V6800 RFID_EVENT
   * - Trigger RFID_SNAPSHOT query to get current state
   * - Response will be handled by processV6800Snapshot
   */
  processV6800Event(event: SUORfidEvent): void {
    this.logger.debug('Processing V6800 RFID_EVENT - triggering snapshot query', {
      deviceId: event.deviceId,
      moduleIndex: event.moduleIndex,
    });

    // Trigger snapshot query for the affected module
    this.triggerRfidSnapshotQuery(event.deviceId, 'V6800', event.moduleIndex);
  }

  /**
   * Process V6800 RFID_SNAPSHOT - delegates to unified handler
   */
  processV6800Snapshot(snapshot: SUORfidSnapshot): void {
    this.processRfidSnapshot(snapshot);
  }

  /**
   * Process snapshot and detect changes compared to cached state
   * Returns array of changes detected
   */
  private processSnapshotAndDetectChanges(snapshot: SUORfidSnapshot): RFIDChangeEvent[] {
    const { deviceId, deviceType, moduleIndex, moduleId } = snapshot;

    // Get previous state from cache
    const previousState = this.getPreviousRfidState(deviceId, moduleIndex);

    // Create new state from snapshot
    const newSensors = new Map<number, RFIDSensorState>();
    for (const sensor of snapshot.data.sensors) {
      newSensors.set(sensor.sensorIndex, {
        sensorIndex: sensor.sensorIndex,
        tagId: sensor.tagId,
        isAlarm: sensor.isAlarm,
      });
    }

    // Detect changes
    const changes: RFIDChangeEvent[] = [];
    const timestamp = new Date().toISOString();

    if (previousState) {
      // Compare with previous state
      const previousMap = new Map<number, RFIDSensorState>();
      for (const sensor of previousState.rfidSnapshot) {
        previousMap.set(sensor.sensorIndex, sensor);
      }

      // Check for changes in current sensors
      for (const [sensorIndex, newSensor] of newSensors) {
        const previousSensor = previousMap.get(sensorIndex);

        if (!previousSensor) {
          // New sensor not seen before
          if (newSensor.tagId) {
            changes.push({
              deviceId,
              deviceType,
              moduleIndex,
              moduleId,
              sensorIndex,
              tagId: newSensor.tagId,
              action: 'ATTACHED',
              isAlarm: newSensor.isAlarm,
              timestamp,
            });
          }
        } else if (previousSensor.tagId !== newSensor.tagId) {
          // Tag changed
          if (previousSensor.tagId && !newSensor.tagId) {
            // Tag detached
            changes.push({
              deviceId,
              deviceType,
              moduleIndex,
              moduleId,
              sensorIndex,
              tagId: previousSensor.tagId,
              action: 'DETACHED',
              isAlarm: previousSensor.isAlarm,
              timestamp,
            });
          } else if (!previousSensor.tagId && newSensor.tagId) {
            // Tag attached
            changes.push({
              deviceId,
              deviceType,
              moduleIndex,
              moduleId,
              sensorIndex,
              tagId: newSensor.tagId,
              action: 'ATTACHED',
              isAlarm: newSensor.isAlarm,
              timestamp,
            });
          } else {
            // Tag swapped (detached old, attached new)
            if (previousSensor.tagId) {
              changes.push({
                deviceId,
                deviceType,
                moduleIndex,
                moduleId,
                sensorIndex,
                tagId: previousSensor.tagId,
                action: 'DETACHED',
                isAlarm: previousSensor.isAlarm,
                timestamp,
              });
            }
            if (newSensor.tagId) {
              changes.push({
                deviceId,
                deviceType,
                moduleIndex,
                moduleId,
                sensorIndex,
                tagId: newSensor.tagId,
                action: 'ATTACHED',
                isAlarm: newSensor.isAlarm,
                timestamp,
              });
            }
          }
        }
      }

      // Check for sensors that were removed entirely
      for (const [sensorIndex, previousSensor] of previousMap) {
        if (!newSensors.has(sensorIndex) && previousSensor.tagId) {
          changes.push({
            deviceId,
            deviceType,
            moduleIndex,
            moduleId,
            sensorIndex,
            tagId: previousSensor.tagId,
            action: 'DETACHED',
            isAlarm: previousSensor.isAlarm,
            timestamp,
          });
        }
      }
    } else {
      // No previous state - treat all present tags as ATTACHED
      for (const sensor of snapshot.data.sensors) {
        if (sensor.tagId) {
          changes.push({
            deviceId,
            deviceType,
            moduleIndex,
            moduleId,
            sensorIndex: sensor.sensorIndex,
            tagId: sensor.tagId,
            action: 'ATTACHED',
            isAlarm: sensor.isAlarm,
            timestamp,
          });
        }
      }
    }

    // Update cache with new state
    this.updateRfidStateInCache(deviceId, moduleIndex, snapshot);

    return changes;
  }

  /**
   * Get previous RFID state from cache
   */
  private getPreviousRfidState(deviceId: string, moduleIndex: number): ModuleTelemetry | null {
    return this.cache.getModule(deviceId, moduleIndex);
  }

  /**
   * Update RFID state in UOS cache
   */
  private updateRfidStateInCache(
    deviceId: string,
    moduleIndex: number,
    snapshot: SUORfidSnapshot
  ): void {
    const existing = this.cache.getModule(deviceId, moduleIndex);

    const telemetry: ModuleTelemetry = {
      deviceId,
      deviceType: snapshot.deviceType,
      moduleIndex,
      moduleId: snapshot.moduleId,
      isOnline: true,
      lastSeenHb: existing?.lastSeenHb ?? null,
      uTotal: existing?.uTotal ?? null,
      tempHum: existing?.tempHum ?? [],
      lastSeenTh: existing?.lastSeenTh ?? null,
      noiseLevel: existing?.noiseLevel ?? [],
      lastSeenNs: existing?.lastSeenNs ?? null,
      rfidSnapshot: snapshot.data.sensors.map(sensor => ({
        sensorIndex: sensor.sensorIndex,
        tagId: sensor.tagId,
        isAlarm: sensor.isAlarm,
      })),
      lastSeenRfid: new Date().toISOString(),
      door1State: existing?.door1State ?? null,
      door2State: existing?.door2State ?? null,
      lastSeenDoor: existing?.lastSeenDoor ?? null,
    };

    this.cache.setModule(deviceId, moduleIndex, telemetry);
  }

  /**
   * Generate unique message ID using timestamp and counter
   */
  private generateMessageId(): string {
    this.messageIdCounter = (this.messageIdCounter + 1) % 1000000;
    return `rfid-${Date.now()}-${this.messageIdCounter.toString(36).padStart(6, '0')}`;
  }

  /**
   * Emit unified RFID event via EventBus
   * Includes deduplication check
   */
  private emitRFIDEvent(change: RFIDChangeEvent): void {
    // Periodic cleanup of deduplication window to prevent memory leak
    this.emitCallCount++;
    if (this.emitCallCount >= this.CLEANUP_INTERVAL) {
      this.cleanupDedupWindow();
      this.emitCallCount = 0;
    }

    // Check deduplication
    const dedupKey = this.generateDedupKey(change);
    const lastEmitted = this.dedupWindow.get(dedupKey);

    if (lastEmitted) {
      const timeSinceLastEmit = Date.now() - lastEmitted;
      if (timeSinceLastEmit < this.config.dedupWindowMs) {
        this.logger.debug('Deduplicating RFID event', {
          deviceId: change.deviceId,
          moduleIndex: change.moduleIndex,
          sensorIndex: change.sensorIndex,
          action: change.action,
          tagId: change.tagId,
          timeSinceLastEmit,
        });
        return;
      }
    }

    // Record this emission
    this.dedupWindow.set(dedupKey, Date.now());

    // Build SUO_RFID_EVENT message
    const event: SUORfidEvent = {
      suoType: 'SUO_RFID_EVENT',
      deviceId: change.deviceId,
      deviceType: change.deviceType,
      moduleIndex: change.moduleIndex,
      moduleId: change.moduleId,
      serverTimestamp: change.timestamp,
      deviceTimestamp: null,
      messageId: this.generateMessageId(),
      data: {
        sensorIndex: change.sensorIndex,
        tagId: change.tagId,
        action: change.action,
        isAlarm: change.isAlarm,
      },
    };

    // Emit via EventBus
    eventBus.emit(SystemEvents.SUO_MQTT_MESSAGE, { message: event });

    this.logger.info('Emitted unified RFID event', {
      deviceId: change.deviceId,
      moduleIndex: change.moduleIndex,
      sensorIndex: change.sensorIndex,
      action: change.action,
      tagId: change.tagId,
    });
  }

  /**
   * Generate deduplication key for an RFID change
   */
  private generateDedupKey(change: RFIDChangeEvent): string {
    return `${change.deviceId}:${change.moduleIndex}:${change.sensorIndex}:${change.action}:${change.tagId}`;
  }

  /**
   * Trigger RFID_SNAPSHOT query for V6800
   * V5008 Query: 0xE9 0x01 moduleIndex
   * V6800 Query: msg_type: 'u_state_req' JSON
   */
  private triggerRfidSnapshotQuery(
    deviceId: string,
    deviceType: 'V5008' | 'V6800',
    moduleIndex: number
  ): void {
    this.logger.debug('Triggering RFID snapshot query', {
      deviceId,
      deviceType,
      moduleIndex,
    });

    let topic: string;
    let payload: Buffer;

    if (deviceType === 'V5008') {
      // V5008: Binary query command 0xE9 0x01 moduleIndex
      topic = `V5008Download/${deviceId}`;
      payload = Buffer.from([0xe9, 0x01, moduleIndex]);
    } else {
      // V6800: JSON query command
      topic = `V6800Download/${deviceId}`;
      payload = Buffer.from(
        JSON.stringify({
          msg_type: 'u_state_req',
          gateway_port_index: moduleIndex,
        })
      );
    }

    const commandEvent: CommandPublishEvent = {
      commandId: `rfid-query-${Date.now()}`,
      topic,
      payload,
      qos: 1,
      timestamp: new Date(),
    };

    eventBus.emit<CommandPublishEvent>(SystemEvents.COMMAND_PUBLISH, commandEvent);

    this.logger.info('RFID snapshot query triggered', {
      deviceId,
      deviceType,
      moduleIndex,
      topic,
    });
  }

  /**
   * Clear deduplication window (for testing)
   */
  clearDedupWindow(): void {
    this.dedupWindow.clear();
    this.logger.debug('Deduplication window cleared');
  }

  /**
   * Get deduplication window size (for testing)
   */
  getDedupWindowSize(): number {
    return this.dedupWindow.size;
  }

  /**
   * Clean up old deduplication entries
   */
  private cleanupDedupWindow(): void {
    const now = Date.now();
    const maxAge = this.config.dedupWindowMs * 2; // Keep entries for 2x the window

    for (const [key, timestamp] of this.dedupWindow.entries()) {
      if (now - timestamp > maxAge) {
        this.dedupWindow.delete(key);
      }
    }
  }
}
