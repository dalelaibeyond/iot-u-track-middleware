/**
 * Device Controller
 *
 * Handles device-related API requests
 */

import { Request, Response } from 'express';
import { Application } from '../../app';
import { NotFoundError, BadRequestError, ValidationError } from '../middleware/error-handler';
import { SUORepository } from '../../database/suo-repository';
import { SUOType } from '../../types/suo.types';

export class DeviceController {
  private application: Application;
  private suoRepository: SUORepository | null = null;

  constructor(application: Application) {
    this.application = application;

    // Initialize repository if database is enabled
    const db = application.getDatabase();
    if (db.isDatabaseConnected()) {
      this.suoRepository = new SUORepository(db);
    }
  }

  /**
   * GET /devices - List all devices
   */
  async listDevices(_req: Request, res: Response): Promise<void> {
    const cacheManager = this.application.getUOSCacheManager();
    const deviceIds = cacheManager.getAllDeviceIds();

    const devices = deviceIds.map(deviceId => {
      const deviceInfo = cacheManager.getDeviceInfo(deviceId);
      const modules = cacheManager.getDeviceModules(deviceId);

      return {
        deviceId,
        deviceType: deviceInfo?.deviceType ?? 'unknown',
        isOnline: this.isDeviceOnline(modules),
        moduleCount: modules.length,
        lastSeen: deviceInfo?.lastSeenInfo ?? null,
        ip: deviceInfo?.ip ?? null,
        mac: deviceInfo?.mac ?? null,
      };
    });

    res.json({
      success: true,
      count: devices.length,
      data: devices,
    });
  }

  /**
   * GET /devices/:id - Get device details
   */
  async getDevice(req: Request, res: Response): Promise<void> {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const cacheManager = this.application.getUOSCacheManager();

    const deviceInfo = cacheManager.getDeviceInfo(id);
    const modules = cacheManager.getDeviceModules(id);

    if (!deviceInfo && modules.length === 0) {
      throw new NotFoundError('Device', id);
    }

    // Calculate device online status based on module heartbeats
    const isOnline = this.isDeviceOnline(modules);
    const lastSeen = this.getLastSeen(deviceInfo, modules);

    res.json({
      success: true,
      data: {
        deviceId: id,
        deviceType: deviceInfo?.deviceType ?? modules[0]?.deviceType ?? 'unknown',
        isOnline,
        lastSeen,
        network: {
          ip: deviceInfo?.ip ?? null,
          mac: deviceInfo?.mac ?? null,
          mask: deviceInfo?.mask ?? null,
          gwIp: deviceInfo?.gwIp ?? null,
        },
        firmware: {
          version: deviceInfo?.fwVer ?? null,
        },
        modules: modules.map(module => ({
          moduleIndex: module.moduleIndex,
          moduleId: module.moduleId,
          uTotal: module.uTotal,
          isOnline: module.isOnline,
          lastSeenHb: module.lastSeenHb,
          telemetry: {
            tempHum: {
              data: module.tempHum,
              lastSeen: module.lastSeenTh,
            },
            noiseLevel: {
              data: module.noiseLevel,
              lastSeen: module.lastSeenNs,
            },
            rfidSnapshot: {
              data: module.rfidSnapshot,
              lastSeen: module.lastSeenRfid,
            },
            doorState: {
              door1: module.door1State,
              door2: module.door2State,
              lastSeen: module.lastSeenDoor,
            },
          },
        })),
      },
    });
  }

  /**
   * GET /devices/:id/modules - Get device modules
   */
  async getDeviceModules(req: Request, res: Response): Promise<void> {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const cacheManager = this.application.getUOSCacheManager();

    const modules = cacheManager.getDeviceModules(id);

    if (modules.length === 0) {
      // Check if device exists at all
      const deviceInfo = cacheManager.getDeviceInfo(id);
      if (!deviceInfo) {
        throw new NotFoundError('Device', id);
      }
    }

    res.json({
      success: true,
      count: modules.length,
      data: modules.map(module => ({
        deviceId: module.deviceId,
        deviceType: module.deviceType,
        moduleIndex: module.moduleIndex,
        moduleId: module.moduleId,
        uTotal: module.uTotal,
        isOnline: module.isOnline,
        lastSeenHb: module.lastSeenHb,
        telemetry: {
          tempHum: {
            data: module.tempHum,
            lastSeen: module.lastSeenTh,
          },
          noiseLevel: {
            data: module.noiseLevel,
            lastSeen: module.lastSeenNs,
          },
          rfidSnapshot: {
            data: module.rfidSnapshot,
            lastSeen: module.lastSeenRfid,
          },
          doorState: {
            door1: module.door1State,
            door2: module.door2State,
            lastSeen: module.lastSeenDoor,
          },
        },
      })),
    });
  }

  /**
   * GET /devices/:id/history - Get device history
   */
  async getDeviceHistory(req: Request, res: Response): Promise<void> {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { type, limit = '100', moduleIndex, startDate, endDate } = req.query;

    // Validate type
    const validTypes: SUOType[] = [
      'SUO_DEV_MOD',
      'SUO_HEARTBEAT',
      'SUO_RFID_SNAPSHOT',
      'SUO_RFID_EVENT',
      'SUO_TEMP_HUM',
      'SUO_NOISE_LEVEL',
      'SUO_DOOR_STATE',
      'SUO_COMMAND_RESULT',
    ];

    if (!type || !validTypes.includes(type as SUOType)) {
      throw new ValidationError('Invalid or missing type parameter', {
        validTypes,
        provided: type,
      });
    }

    // Check if database is available
    if (!this.suoRepository) {
      throw new BadRequestError('Database is not enabled or connected');
    }

    // Parse limit
    const limitNum = parseInt(limit as string, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
      throw new ValidationError('Invalid limit parameter', { min: 1, max: 1000 });
    }

    try {
      let history: Array<Record<string, unknown>>;

      if (moduleIndex !== undefined) {
        // Query module-specific history
        const moduleIdx = parseInt(moduleIndex as string, 10);
        if (isNaN(moduleIdx)) {
          throw new ValidationError('Invalid moduleIndex parameter');
        }
        history = await this.suoRepository.queryModuleHistory(
          id,
          moduleIdx,
          type as string,
          limitNum
        );
      } else {
        // Query device-wide history
        history = await this.suoRepository.queryDeviceHistory(id, type as string, limitNum);
      }

      res.json({
        success: true,
        count: history.length,
        query: {
          deviceId: id,
          type,
          moduleIndex: moduleIndex ?? null,
          limit: limitNum,
          startDate: startDate || null,
          endDate: endDate || null,
        },
        data: history,
      });
    } catch (error) {
      throw new BadRequestError('Failed to query device history', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Check if device is online based on module states
   */
  private isDeviceOnline(modules: Array<{ isOnline: boolean }>): boolean {
    if (modules.length === 0) return false;
    return modules.some(m => m.isOnline);
  }

  /**
   * Get last seen timestamp from device info or modules
   */
  private getLastSeen(
    deviceInfo: { lastSeenInfo: string | null } | null,
    modules: Array<{ lastSeenHb: string | null }>
  ): string | null {
    if (deviceInfo?.lastSeenInfo) {
      return deviceInfo.lastSeenInfo;
    }

    // Find most recent module heartbeat
    const timestamps = modules.map(m => m.lastSeenHb).filter((t): t is string => t !== null);

    if (timestamps.length === 0) return null;

    return timestamps.sort().reverse()[0];
  }
}
