/**
 * Watchdog Module
 *
 * Scheduled task runner for health checks and maintenance
 * - Device health monitoring
 * - Cache cleanup
 * - Connection health checks
 * - Metric collection
 */

import { eventBus, SystemEvents } from '../../core/event-bus';
import { Logger } from '../../utils/logger';
import { UOSCacheManager } from '../cache';
import { SystemErrorEvent } from '../../types/event.types';

export interface WatchdogTask {
  name: string;
  interval: number; // Milliseconds
  enabled: boolean;
  handler: () => void | Promise<void>;
}

export interface WatchdogConfig {
  enabled: boolean;
  healthCheckInterval: number;
  tasks: Array<{
    name: string;
    interval: number;
    enabled: boolean;
  }>;
}

export class WatchdogModule {
  private config: WatchdogConfig;
  private logger: Logger;
  private cacheManager: UOSCacheManager;
  private isRunning: boolean = false;
  private taskIntervals: Map<string, NodeJS.Timeout> = new Map();
  private tasks: WatchdogTask[] = [];

  constructor(config: WatchdogConfig, cacheManager: UOSCacheManager) {
    this.config = config;
    this.logger = new Logger('Watchdog');
    this.cacheManager = cacheManager;
    this.initializeTasks();
  }

  /**
   * Initialize default tasks
   */
  private initializeTasks(): void {
    this.tasks = [
      {
        name: 'cacheCleanup',
        interval: 60000, // 1 minute
        enabled: true,
        handler: this.cacheCleanupTask.bind(this),
      },
      {
        name: 'deviceHealthCheck',
        interval: this.config.healthCheckInterval || 30000, // 30 seconds
        enabled: true,
        handler: this.deviceHealthCheckTask.bind(this),
      },
      {
        name: 'metricsCollection',
        interval: 60000, // 1 minute
        enabled: true,
        handler: this.metricsCollectionTask.bind(this),
      },
      {
        name: 'staleDataDetection',
        interval: 60000, // 1 minute
        enabled: true,
        handler: this.staleDataDetectionTask.bind(this),
      },
    ];

    // Override with config
    for (const configTask of this.config.tasks || []) {
      const task = this.tasks.find(t => t.name === configTask.name);
      if (task) {
        task.interval = configTask.interval;
        task.enabled = configTask.enabled;
      }
    }
  }

  /**
   * Start the Watchdog module
   */
  start(): void {
    if (this.isRunning) {
      this.logger.warn('Watchdog is already running');
      return;
    }

    if (!this.config.enabled) {
      this.logger.info('Watchdog is disabled');
      return;
    }

    this.logger.info('Starting Watchdog module...');

    // Schedule all enabled tasks
    for (const task of this.tasks) {
      if (task.enabled) {
        this.scheduleTask(task);
      }
    }

    this.isRunning = true;
    this.logger.info(
      `Watchdog module started with ${this.tasks.filter(t => t.enabled).length} tasks`
    );
  }

  /**
   * Stop the Watchdog module
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('Stopping Watchdog module...');

    // Clear all intervals
    for (const [name, interval] of this.taskIntervals.entries()) {
      clearInterval(interval);
      this.logger.debug(`Stopped task: ${name}`);
    }

    this.taskIntervals.clear();
    this.isRunning = false;
    this.logger.info('Watchdog module stopped');
  }

  /**
   * Schedule a task
   */
  private scheduleTask(task: WatchdogTask): void {
    this.logger.debug(`Scheduling task: ${task.name} (interval: ${task.interval}ms)`);

    // Run immediately on start
    this.runTask(task);

    // Schedule periodic execution
    const interval = setInterval(() => {
      this.runTask(task);
    }, task.interval);

    this.taskIntervals.set(task.name, interval);
  }

  /**
   * Run a single task with error handling
   */
  private async runTask(task: WatchdogTask): Promise<void> {
    try {
      this.logger.debug(`Running task: ${task.name}`);
      await task.handler();
    } catch (error) {
      this.logger.error(`Task failed: ${task.name}`, {
        error: error instanceof Error ? error.message : String(error),
      });

      // Emit system error event
      const errorEvent: SystemErrorEvent = {
        error: error instanceof Error ? error : new Error(String(error)),
        component: `Watchdog.${task.name}`,
        fatal: false,
        timestamp: new Date(),
      };

      eventBus.emit<SystemErrorEvent>(SystemEvents.SYSTEM_ERROR, errorEvent);
    }
  }

  /**
   * Task: Cache cleanup
   * Removes expired entries
   */
  private cacheCleanupTask(): void {
    const stats = this.cacheManager.getStats();

    this.logger.debug('Cache cleanup task running', {
      size: stats.size,
      maxSize: stats.maxSize,
    });

    // The cache has built-in TTL cleanup, but we can force it here if needed
    // For now, just log statistics
    if (stats.size > stats.maxSize * 0.9) {
      this.logger.warn('Cache is approaching capacity', {
        size: stats.size,
        maxSize: stats.maxSize,
        utilization: `${((stats.size / stats.maxSize) * 100).toFixed(1)}%`,
      });
    }
  }

  /**
   * Task: Device health check
   * Checks for offline devices based on heartbeat timestamps
   */
  private deviceHealthCheckTask(): void {
    this.logger.debug('Device health check task running');

    const now = Date.now();
    const offlineThreshold = 5 * 60 * 1000; // 5 minutes
    const offlineDeviceIds: string[] = [];

    // Get all device IDs from cache
    const deviceIds = this.cacheManager.getAllDeviceIds();

    for (const deviceId of deviceIds) {
      // Get all modules for this device
      const modules = this.cacheManager.getDeviceModules(deviceId);

      for (const module of modules) {
        // Check if module has missed heartbeat threshold
        if (module.lastSeenHb) {
          const lastHbTime = new Date(module.lastSeenHb).getTime();
          const timeSinceLastHb = now - lastHbTime;

          if (timeSinceLastHb > offlineThreshold) {
            // Mark module as offline
            if (module.isOnline) {
              module.isOnline = false;
              this.cacheManager.getCache().setModule(deviceId, module.moduleIndex, module);

              if (!offlineDeviceIds.includes(deviceId)) {
                offlineDeviceIds.push(deviceId);
              }

              this.logger.warn('Device marked offline due to missed heartbeats', {
                deviceId,
                moduleIndex: module.moduleIndex,
                lastSeenHb: module.lastSeenHb,
                offlineFor: `${Math.round(timeSinceLastHb / 1000)}s`,
              });
            }
          }
        }
      }
    }

    if (offlineDeviceIds.length > 0) {
      this.logger.info(`Health check completed. ${offlineDeviceIds.length} device(s) offline`, {
        offlineDeviceIds,
      });
    } else {
      this.logger.debug('Device health check completed - all devices online');
    }
  }

  /**
   * Task: Metrics collection
   * Collects and logs system metrics
   */
  private metricsCollectionTask(): void {
    const stats = this.cacheManager.getStats();

    this.logger.info('System metrics', {
      cacheSize: stats.size,
      cacheHits: stats.hitCount,
      cacheMisses: stats.missCount,
      hitRate:
        stats.hitCount + stats.missCount > 0
          ? `${((stats.hitCount / (stats.hitCount + stats.missCount)) * 100).toFixed(1)}%`
          : 'N/A',
      evictions: stats.evictionCount,
    });
  }

  /**
   * Task: Stale data detection
   * Detects and logs stale data in cache
   */
  private staleDataDetectionTask(): void {
    this.logger.debug('Stale data detection task running');

    const now = Date.now();
    const staleThreshold = 10 * 60 * 1000; // 10 minutes
    const staleDataWarnings: Array<{
      deviceId: string;
      moduleIndex: number;
      dataType: string;
      lastSeen: string;
    }> = [];

    // Get all device IDs from cache
    const deviceIds = this.cacheManager.getAllDeviceIds();

    for (const deviceId of deviceIds) {
      // Get all modules for this device
      const modules = this.cacheManager.getDeviceModules(deviceId);

      for (const module of modules) {
        // Check TEMP_HUM data staleness
        if (module.lastSeenTh) {
          const lastThTime = new Date(module.lastSeenTh).getTime();
          if (now - lastThTime > staleThreshold) {
            staleDataWarnings.push({
              deviceId,
              moduleIndex: module.moduleIndex,
              dataType: 'TEMP_HUM',
              lastSeen: module.lastSeenTh,
            });
          }
        }

        // Check NOISE_LEVEL data staleness (V5008 only)
        if (module.lastSeenNs) {
          const lastNsTime = new Date(module.lastSeenNs).getTime();
          if (now - lastNsTime > staleThreshold) {
            staleDataWarnings.push({
              deviceId,
              moduleIndex: module.moduleIndex,
              dataType: 'NOISE_LEVEL',
              lastSeen: module.lastSeenNs,
            });
          }
        }

        // Check RFID_SNAPSHOT data staleness
        if (module.lastSeenRfid) {
          const lastRfidTime = new Date(module.lastSeenRfid).getTime();
          if (now - lastRfidTime > staleThreshold) {
            staleDataWarnings.push({
              deviceId,
              moduleIndex: module.moduleIndex,
              dataType: 'RFID_SNAPSHOT',
              lastSeen: module.lastSeenRfid,
            });
          }
        }

        // Check DOOR_STATE data staleness
        if (module.lastSeenDoor) {
          const lastDoorTime = new Date(module.lastSeenDoor).getTime();
          if (now - lastDoorTime > staleThreshold) {
            staleDataWarnings.push({
              deviceId,
              moduleIndex: module.moduleIndex,
              dataType: 'DOOR_STATE',
              lastSeen: module.lastSeenDoor,
            });
          }
        }
      }
    }

    // Log warnings for stale data
    if (staleDataWarnings.length > 0) {
      for (const warning of staleDataWarnings) {
        this.logger.warn('Stale data detected', warning);
      }
      this.logger.info(
        `Stale data detection completed. ${staleDataWarnings.length} stale entries found`
      );
    } else {
      this.logger.debug('Stale data detection completed - no stale data found');
    }
  }

  /**
   * Add a custom task
   */
  addTask(task: WatchdogTask): void {
    if (this.isRunning && task.enabled) {
      this.scheduleTask(task);
    }
    this.tasks.push(task);
    this.logger.info(`Added task: ${task.name}`);
  }

  /**
   * Remove a task
   */
  removeTask(taskName: string): void {
    const interval = this.taskIntervals.get(taskName);
    if (interval) {
      clearInterval(interval);
      this.taskIntervals.delete(taskName);
    }

    this.tasks = this.tasks.filter(t => t.name !== taskName);
    this.logger.info(`Removed task: ${taskName}`);
  }

  /**
   * Enable/disable a task
   */
  setTaskEnabled(taskName: string, enabled: boolean): void {
    const task = this.tasks.find(t => t.name === taskName);
    if (!task) {
      this.logger.warn(`Task not found: ${taskName}`);
      return;
    }

    task.enabled = enabled;

    if (this.isRunning) {
      if (enabled && !this.taskIntervals.has(taskName)) {
        this.scheduleTask(task);
      } else if (!enabled && this.taskIntervals.has(taskName)) {
        const interval = this.taskIntervals.get(taskName);
        if (interval) {
          clearInterval(interval);
          this.taskIntervals.delete(taskName);
        }
      }
    }

    this.logger.info(`Task ${taskName} ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get list of tasks
   */
  getTasks(): Array<{ name: string; interval: number; enabled: boolean }> {
    return this.tasks.map(t => ({
      name: t.name,
      interval: t.interval,
      enabled: t.enabled,
    }));
  }

  /**
   * Check if module is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get configuration
   */
  getConfig(): WatchdogConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<WatchdogConfig>): void {
    const wasRunning = this.isRunning;

    if (wasRunning) {
      this.stop();
    }

    this.config = { ...this.config, ...config };

    // Reinitialize tasks with new config
    this.initializeTasks();

    if (wasRunning) {
      this.start();
    }

    this.logger.info('Watchdog configuration updated');
  }
}
