/**
 * Stats Controller
 *
 * Handles system statistics API requests
 */

import { Request, Response } from 'express';
import { Application } from '../../app';

export class StatsController {
  private application: Application;

  constructor(application: Application) {
    this.application = application;
  }

  /**
   * GET /stats - Get all system statistics
   */
  async getAllStats(_req: Request, res: Response): Promise<void> {
    const cacheStats = this.getCacheStatistics();
    const mqttStats = this.getMQTTStatistics();
    const dbStats = this.getDatabaseStatistics();
    const systemStats = this.getSystemStatistics();

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        system: systemStats,
        cache: cacheStats,
        mqtt: mqttStats,
        database: dbStats,
      },
    });
  }

  /**
   * GET /stats/cache - Get cache statistics
   */
  async getCacheStats(_req: Request, res: Response): Promise<void> {
    const stats = this.getCacheStatistics();

    res.json({
      success: true,
      data: stats,
    });
  }

  /**
   * GET /stats/mqtt - Get MQTT statistics
   */
  async getMQTTStats(_req: Request, res: Response): Promise<void> {
    const stats = this.getMQTTStatistics();

    res.json({
      success: true,
      data: stats,
    });
  }

  /**
   * GET /stats/database - Get database statistics
   */
  async getDatabaseStats(_req: Request, res: Response): Promise<void> {
    const stats = this.getDatabaseStatistics();

    res.json({
      success: true,
      data: stats,
    });
  }

  /**
   * Get cache statistics
   */
  private getCacheStatistics(): Record<string, unknown> {
    const cacheManager = this.application.getUOSCacheManager();
    const cacheStats = cacheManager.getStats();

    // Get device and module counts
    const deviceIds = cacheManager.getAllDeviceIds();
    let totalModules = 0;

    for (const deviceId of deviceIds) {
      totalModules += cacheManager.getDeviceModules(deviceId).length;
    }

    const total = cacheStats.hitCount + cacheStats.missCount;
    const hitRate = total > 0 ? (cacheStats.hitCount / total) * 100 : 0;

    return {
      enabled: true,
      entries: {
        total: cacheStats.size,
        max: cacheStats.maxSize,
        utilization:
          cacheStats.maxSize > 0
            ? Math.round((cacheStats.size / cacheStats.maxSize) * 100 * 100) / 100
            : 0,
      },
      performance: {
        hits: cacheStats.hitCount,
        misses: cacheStats.missCount,
        hitRate: Math.round(hitRate * 100) / 100,
        evictions: cacheStats.evictionCount,
      },
      devices: {
        count: deviceIds.length,
        totalModules,
      },
      backpressure: {
        maxQueueSize: cacheStats.maxQueueSize,
        queuedOperations: cacheStats.queuedOperations,
      },
    };
  }

  /**
   * Get MQTT statistics
   */
  private getMQTTStatistics(): Record<string, unknown> {
    const mqttSubscriber = this.application.getMQTTSubscriber();
    const status = mqttSubscriber.getStatus();

    return {
      connected: status.isConnected,
      broker: {
        url: status.brokerUrl,
      },
      connection: {
        reconnectAttempts: status.reconnectAttempts,
      },
    };
  }

  /**
   * Get database statistics
   */
  private getDatabaseStatistics(): Record<string, unknown> {
    const database = this.application.getDatabase();
    const dbWriter = this.application.getDatabaseWriter();

    return {
      connected: database.isDatabaseConnected(),
      pool: database.isDatabaseConnected()
        ? {
            // These could be exposed from the Database class if needed
            // For now, we show basic connection status
          }
        : null,
      writer: {
        enabled: dbWriter.isActive(),
        // Additional writer stats could be added here
      },
    };
  }

  /**
   * Get system statistics
   */
  private getSystemStatistics(): Record<string, unknown> {
    const uptime = process.uptime();
    const memory = process.memoryUsage();

    return {
      application: {
        running: this.application.isAppRunning(),
        uptime: Math.floor(uptime),
        uptimeFormatted: this.formatUptime(uptime),
      },
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      memory: {
        used: {
          bytes: memory.heapUsed,
          mb: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
        },
        total: {
          bytes: memory.heapTotal,
          mb: Math.round((memory.heapTotal / 1024 / 1024) * 100) / 100,
        },
        rss: {
          bytes: memory.rss,
          mb: Math.round((memory.rss / 1024 / 1024) * 100) / 100,
        },
      },
      environment: process.env.NODE_ENV ?? 'development',
    };
  }

  /**
   * Format uptime in human-readable format
   */
  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);

    return parts.join(' ');
  }
}
