/**
 * UOS Cache Tests
 *
 * Test suite for UOS Cache implementation
 */

import { UOSCache } from '@modules/cache/uos-cache';
import { ModuleTelemetry, DeviceMetadata } from '@t/uos.types';

describe('UOS Cache', () => {
  let cache: UOSCache;

  beforeEach(() => {
    cache = new UOSCache({ maxSize: 100, defaultTTL: 60 });
  });

  afterEach(() => {
    cache.dispose();
  });

  describe('Module Telemetry', () => {
    it('should store and retrieve module telemetry', () => {
      const moduleState: ModuleTelemetry = {
        deviceId: '12345',
        deviceType: 'V5008',
        moduleIndex: 1,
        moduleId: '67890',
        isOnline: true,
        lastSeenHb: new Date().toISOString(),
        uTotal: 54,
        tempHum: [],
        lastSeenTh: null,
        noiseLevel: [],
        lastSeenNs: null,
        rfidSnapshot: [],
        lastSeenRfid: null,
        door1State: 0,
        door2State: null,
        lastSeenDoor: null,
      };

      cache.setModule('12345', 1, moduleState);
      const retrieved = cache.getModule('12345', 1);

      expect(retrieved).toEqual(moduleState);
    });

    it('should update existing module telemetry', () => {
      const initialState: ModuleTelemetry = {
        deviceId: '12345',
        deviceType: 'V5008',
        moduleIndex: 1,
        moduleId: '67890',
        isOnline: true,
        lastSeenHb: '2026-01-01T00:00:00.000Z',
        uTotal: 54,
        tempHum: [],
        lastSeenTh: null,
        noiseLevel: [],
        lastSeenNs: null,
        rfidSnapshot: [],
        lastSeenRfid: null,
        door1State: 0,
        door2State: null,
        lastSeenDoor: null,
      };

      cache.setModule('12345', 1, initialState);

      const updatedState: ModuleTelemetry = {
        ...initialState,
        isOnline: false,
        lastSeenHb: '2026-01-01T01:00:00.000Z',
      };

      cache.setModule('12345', 1, updatedState);
      const retrieved = cache.getModule('12345', 1);

      expect(retrieved?.isOnline).toBe(false);
      expect(retrieved?.lastSeenHb).toBe('2026-01-01T01:00:00.000Z');
    });

    it('should return null for non-existent module', () => {
      const retrieved = cache.getModule('nonexistent', 1);
      expect(retrieved).toBeNull();
    });

    it('should retrieve all modules for a device', () => {
      const module1: ModuleTelemetry = {
        deviceId: '12345',
        deviceType: 'V5008',
        moduleIndex: 1,
        moduleId: '11111',
        isOnline: true,
        lastSeenHb: new Date().toISOString(),
        uTotal: 54,
        tempHum: [],
        lastSeenTh: null,
        noiseLevel: [],
        lastSeenNs: null,
        rfidSnapshot: [],
        lastSeenRfid: null,
        door1State: 0,
        door2State: null,
        lastSeenDoor: null,
      };

      const module2: ModuleTelemetry = {
        deviceId: '12345',
        deviceType: 'V5008',
        moduleIndex: 2,
        moduleId: '22222',
        isOnline: true,
        lastSeenHb: new Date().toISOString(),
        uTotal: 54,
        tempHum: [],
        lastSeenTh: null,
        noiseLevel: [],
        lastSeenNs: null,
        rfidSnapshot: [],
        lastSeenRfid: null,
        door1State: 1,
        door2State: null,
        lastSeenDoor: null,
      };

      cache.setModule('12345', 1, module1);
      cache.setModule('12345', 2, module2);

      const allModules = cache.getAllModules('12345');

      expect(allModules).toHaveLength(2);
      expect(allModules.map((m) => m.moduleIndex)).toContain(1);
      expect(allModules.map((m) => m.moduleIndex)).toContain(2);
    });
  });

  describe('Device Metadata', () => {
    it('should store and retrieve device metadata', () => {
      const deviceInfo: DeviceMetadata = {
        deviceId: '12345',
        deviceType: 'V5008',
        ip: '192.168.1.100',
        mac: 'AA:BB:CC:DD:EE:FF',
        fwVer: '1.0.0',
        mask: '255.255.255.0',
        gwIp: '192.168.1.1',
        lastSeenInfo: new Date().toISOString(),
        activeModules: [
          { moduleIndex: 1, moduleId: '11111', fwVer: '1.0.0', uTotal: 54 },
        ],
      };

      cache.setDeviceInfo('12345', deviceInfo);
      const retrieved = cache.getDeviceInfo('12345');

      expect(retrieved).toEqual(deviceInfo);
    });

    it('should return null for non-existent device', () => {
      const retrieved = cache.getDeviceInfo('nonexistent');
      expect(retrieved).toBeNull();
    });
  });

  describe('Cache Operations', () => {
    it('should delete cache entries', () => {
      const moduleState: ModuleTelemetry = {
        deviceId: '12345',
        deviceType: 'V5008',
        moduleIndex: 1,
        moduleId: '67890',
        isOnline: true,
        lastSeenHb: new Date().toISOString(),
        uTotal: 54,
        tempHum: [],
        lastSeenTh: null,
        noiseLevel: [],
        lastSeenNs: null,
        rfidSnapshot: [],
        lastSeenRfid: null,
        door1State: 0,
        door2State: null,
        lastSeenDoor: null,
      };

      cache.setModule('12345', 1, moduleState);
      expect(cache.getModule('12345', 1)).not.toBeNull();

      const deleted = cache.delete('device:12345:module:1');
      expect(deleted).toBe(true);
      expect(cache.getModule('12345', 1)).toBeNull();
    });

    it('should return false when deleting non-existent key', () => {
      const deleted = cache.delete('device:nonexistent:module:1');
      expect(deleted).toBe(false);
    });

    it('should clear all cache entries', () => {
      const moduleState: ModuleTelemetry = {
        deviceId: '12345',
        deviceType: 'V5008',
        moduleIndex: 1,
        moduleId: '67890',
        isOnline: true,
        lastSeenHb: new Date().toISOString(),
        uTotal: 54,
        tempHum: [],
        lastSeenTh: null,
        noiseLevel: [],
        lastSeenNs: null,
        rfidSnapshot: [],
        lastSeenRfid: null,
        door1State: 0,
        door2State: null,
        lastSeenDoor: null,
      };

      cache.setModule('12345', 1, moduleState);
      cache.clear();

      expect(cache.getModule('12345', 1)).toBeNull();
      expect(cache.getStats().size).toBe(0);
    });
  });

  describe('Cache Statistics', () => {
    it('should track cache statistics', () => {
      const moduleState: ModuleTelemetry = {
        deviceId: '12345',
        deviceType: 'V5008',
        moduleIndex: 1,
        moduleId: '67890',
        isOnline: true,
        lastSeenHb: new Date().toISOString(),
        uTotal: 54,
        tempHum: [],
        lastSeenTh: null,
        noiseLevel: [],
        lastSeenNs: null,
        rfidSnapshot: [],
        lastSeenRfid: null,
        door1State: 0,
        door2State: null,
        lastSeenDoor: null,
      };

      // Initial state
      let stats = cache.getStats();
      expect(stats.size).toBe(0);
      expect(stats.hitCount).toBe(0);
      expect(stats.missCount).toBe(0);

      // Miss
      cache.getModule('12345', 1);
      stats = cache.getStats();
      expect(stats.missCount).toBe(1);

      // Set and hit
      cache.setModule('12345', 1, moduleState);
      cache.getModule('12345', 1);
      stats = cache.getStats();
      expect(stats.size).toBe(1);
      expect(stats.hitCount).toBe(1);
    });
  });

  describe('LRU Eviction', () => {
    it('should evict least recently used entries when full', () => {
      // Create cache with max size of 2
      const smallCache = new UOSCache({ maxSize: 2, defaultTTL: 60 });

      const module1: ModuleTelemetry = {
        deviceId: '12345',
        deviceType: 'V5008',
        moduleIndex: 1,
        moduleId: '11111',
        isOnline: true,
        lastSeenHb: new Date().toISOString(),
        uTotal: 54,
        tempHum: [],
        lastSeenTh: null,
        noiseLevel: [],
        lastSeenNs: null,
        rfidSnapshot: [],
        lastSeenRfid: null,
        door1State: 0,
        door2State: null,
        lastSeenDoor: null,
      };

      const module2: ModuleTelemetry = {
        deviceId: '12345',
        deviceType: 'V5008',
        moduleIndex: 2,
        moduleId: '22222',
        isOnline: true,
        lastSeenHb: new Date().toISOString(),
        uTotal: 54,
        tempHum: [],
        lastSeenTh: null,
        noiseLevel: [],
        lastSeenNs: null,
        rfidSnapshot: [],
        lastSeenRfid: null,
        door1State: 0,
        door2State: null,
        lastSeenDoor: null,
      };

      const module3: ModuleTelemetry = {
        deviceId: '12345',
        deviceType: 'V5008',
        moduleIndex: 3,
        moduleId: '33333',
        isOnline: true,
        lastSeenHb: new Date().toISOString(),
        uTotal: 54,
        tempHum: [],
        lastSeenTh: null,
        noiseLevel: [],
        lastSeenNs: null,
        rfidSnapshot: [],
        lastSeenRfid: null,
        door1State: 0,
        door2State: null,
        lastSeenDoor: null,
      };

      // Add 2 modules (fills cache)
      smallCache.setModule('12345', 1, module1);
      smallCache.setModule('12345', 2, module2);

      // Access module 1 to make it recently used
      smallCache.getModule('12345', 1);

      // Add 3rd module (should evict module 2)
      smallCache.setModule('12345', 3, module3);

      expect(smallCache.getModule('12345', 1)).not.toBeNull(); // Should still exist
      expect(smallCache.getModule('12345', 2)).toBeNull(); // Should be evicted
      expect(smallCache.getModule('12345', 3)).not.toBeNull(); // Should exist

      smallCache.dispose();
    });
  });
});
