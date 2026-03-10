/**
 * UOS Cache Device Info Merge Tests
 *
 * Test suite for device info merge and completion check functionality
 */

import { UOSCache } from '@modules/cache/uos-cache';
import { DeviceMetadata } from '@t/uos.types';

describe('UOS Cache - Device Info Merge', () => {
  let cache: UOSCache;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(Date.now());
    cache = new UOSCache({ maxSize: 100, defaultTTL: 60 });
  });

  afterEach(() => {
    cache.dispose();
    jest.useRealTimers();
  });

  describe('mergeDeviceInfo', () => {
    it('should merge partial device info when no existing data', () => {
      const partialInfo: Partial<DeviceMetadata> = {
        ip: '192.168.1.100',
        mac: 'AA:BB:CC:DD:EE:FF',
      };

      const result = cache.mergeDeviceInfo('device123', partialInfo);

      expect(result.deviceId).toBe('device123');
      expect(result.ip).toBe('192.168.1.100');
      expect(result.mac).toBe('AA:BB:CC:DD:EE:FF');
      expect(result.activeModules).toEqual([]);
    });

    it('should merge partial updates with existing data', () => {
      // Set initial partial data
      const initialInfo: Partial<DeviceMetadata> = {
        ip: '192.168.1.100',
        mac: 'AA:BB:CC:DD:EE:FF',
      };
      cache.mergeDeviceInfo('device123', initialInfo);

      // Merge additional fields
      const updateInfo: Partial<DeviceMetadata> = {
        fwVer: '1.0.0',
        mask: '255.255.255.0',
        gwIp: '192.168.1.1',
      };
      const result = cache.mergeDeviceInfo('device123', updateInfo);

      expect(result.ip).toBe('192.168.1.100'); // Preserved from initial
      expect(result.mac).toBe('AA:BB:CC:DD:EE:FF'); // Preserved from initial
      expect(result.fwVer).toBe('1.0.0'); // From update
      expect(result.mask).toBe('255.255.255.0'); // From update
      expect(result.gwIp).toBe('192.168.1.1'); // From update
    });

    it('should override existing fields with new non-null values', () => {
      const initialInfo: Partial<DeviceMetadata> = {
        ip: '192.168.1.100',
        mac: 'AA:BB:CC:DD:EE:FF',
        fwVer: '1.0.0',
      };
      cache.mergeDeviceInfo('device123', initialInfo);

      const updateInfo: Partial<DeviceMetadata> = {
        ip: '192.168.1.200',
        fwVer: '2.0.0',
      };
      const result = cache.mergeDeviceInfo('device123', updateInfo);

      expect(result.ip).toBe('192.168.1.200'); // Overridden
      expect(result.mac).toBe('AA:BB:CC:DD:EE:FF'); // Preserved
      expect(result.fwVer).toBe('2.0.0'); // Overridden
    });

    it('should merge active modules by moduleIndex', () => {
      const initialInfo: Partial<DeviceMetadata> = {
        ip: '192.168.1.100',
        mac: 'AA:BB:CC:DD:EE:FF',
        activeModules: [
          { moduleIndex: 1, moduleId: 'mod1', fwVer: '1.0.0', uTotal: 54 },
          { moduleIndex: 2, moduleId: 'mod2', fwVer: '1.0.0', uTotal: 54 },
        ],
      };
      cache.mergeDeviceInfo('device123', initialInfo);

      // Update with new module and updated existing module
      const updateInfo: Partial<DeviceMetadata> = {
        activeModules: [
          { moduleIndex: 1, moduleId: 'mod1', fwVer: '1.1.0', uTotal: 60 }, // Update existing
          { moduleIndex: 3, moduleId: 'mod3', fwVer: '1.0.0', uTotal: 54 }, // New module
        ],
      };
      const result = cache.mergeDeviceInfo('device123', updateInfo);

      expect(result.activeModules).toHaveLength(3);

      const module1 = result.activeModules.find(m => m.moduleIndex === 1);
      expect(module1?.fwVer).toBe('1.1.0'); // Updated
      expect(module1?.uTotal).toBe(60); // Updated

      const module2 = result.activeModules.find(m => m.moduleIndex === 2);
      expect(module2?.moduleId).toBe('mod2'); // Preserved

      const module3 = result.activeModules.find(m => m.moduleIndex === 3);
      expect(module3?.moduleId).toBe('mod3'); // New
    });

    it('should preserve deviceType if provided in initial merge', () => {
      const partialInfo: Partial<DeviceMetadata> = {
        deviceType: 'V5008',
        ip: '192.168.1.100',
      };

      const result = cache.mergeDeviceInfo('device123', partialInfo);

      expect(result.deviceType).toBe('V5008');
    });

    it('should update lastSeenInfo timestamp on each merge', () => {
      const beforeTime = Date.now();

      cache.mergeDeviceInfo('device123', { ip: '192.168.1.100' });
      const info1 = cache.getDeviceInfo('device123');

      // Wait a bit to ensure different timestamp
      jest.advanceTimersByTime(100);

      cache.mergeDeviceInfo('device123', { mac: 'AA:BB:CC:DD:EE:FF' });
      const info2 = cache.getDeviceInfo('device123');

      expect(info1?.lastSeenInfo).toBeTruthy();
      expect(info2?.lastSeenInfo).toBeTruthy();
      expect(new Date(info2!.lastSeenInfo!).getTime()).toBeGreaterThanOrEqual(beforeTime);
    });

    it('should return the complete merged device metadata', () => {
      const completeInfo: Partial<DeviceMetadata> = {
        deviceType: 'V6800',
        ip: '192.168.1.100',
        mac: 'AA:BB:CC:DD:EE:FF',
        activeModules: [{ moduleIndex: 1, moduleId: 'mod1', uTotal: 54 }],
      };

      const result = cache.mergeDeviceInfo('device123', completeInfo);

      // Verify it's a complete DeviceMetadata object
      expect(result).toHaveProperty('deviceId', 'device123');
      expect(result).toHaveProperty('deviceType', 'V6800');
      expect(result).toHaveProperty('ip', '192.168.1.100');
      expect(result).toHaveProperty('mac', 'AA:BB:CC:DD:EE:FF');
      expect(result).toHaveProperty('activeModules');
      expect(result).toHaveProperty('lastSeenInfo');
    });
  });

  describe('isDeviceInfoComplete', () => {
    it('should return false when no device info exists', () => {
      expect(cache.isDeviceInfoComplete('nonexistent')).toBe(false);
    });

    it('should return false when required fields are missing (V5008)', () => {
      // Only partial info
      cache.mergeDeviceInfo('device123', {
        deviceType: 'V5008',
        ip: '192.168.1.100',
        mac: 'AA:BB:CC:DD:EE:FF',
      });

      expect(cache.isDeviceInfoComplete('device123')).toBe(false);
    });

    it('should return false when required fields are missing (V6800)', () => {
      cache.mergeDeviceInfo('device123', {
        deviceType: 'V6800',
        ip: '192.168.1.100',
      });

      expect(cache.isDeviceInfoComplete('device123')).toBe(false);
    });

    it('should return true when all required V5008 fields are present', () => {
      cache.mergeDeviceInfo('device123', {
        deviceType: 'V5008',
        ip: '192.168.1.100',
        mac: 'AA:BB:CC:DD:EE:FF',
        fwVer: '1.0.0',
        mask: '255.255.255.0',
        gwIp: '192.168.1.1',
        activeModules: [{ moduleIndex: 1, moduleId: 'mod1', fwVer: '1.0.0', uTotal: 54 }],
      });

      expect(cache.isDeviceInfoComplete('device123')).toBe(true);
    });

    it('should return true when all required V6800 fields are present', () => {
      cache.mergeDeviceInfo('device123', {
        deviceType: 'V6800',
        ip: '192.168.1.100',
        mac: 'AA:BB:CC:DD:EE:FF',
        activeModules: [{ moduleIndex: 1, moduleId: 'mod1', uTotal: 54 }],
      });

      expect(cache.isDeviceInfoComplete('device123')).toBe(true);
    });

    it('should return false when activeModules is empty', () => {
      cache.mergeDeviceInfo('device123', {
        deviceType: 'V5008',
        ip: '192.168.1.100',
        mac: 'AA:BB:CC:DD:EE:FF',
        fwVer: '1.0.0',
        mask: '255.255.255.0',
        gwIp: '192.168.1.1',
        activeModules: [],
      });

      expect(cache.isDeviceInfoComplete('device123')).toBe(false);
    });

    it('should return false when deviceType is missing', () => {
      cache.mergeDeviceInfo('device123', {
        ip: '192.168.1.100',
        mac: 'AA:BB:CC:DD:EE:FF',
        fwVer: '1.0.0',
        mask: '255.255.255.0',
        gwIp: '192.168.1.1',
        activeModules: [{ moduleIndex: 1, moduleId: 'mod1', fwVer: '1.0.0', uTotal: 54 }],
      });

      expect(cache.isDeviceInfoComplete('device123')).toBe(false);
    });

    it('should handle complete info after multiple partial merges', () => {
      // First merge - basic network info
      cache.mergeDeviceInfo('device123', {
        deviceType: 'V5008',
        ip: '192.168.1.100',
        mac: 'AA:BB:CC:DD:EE:FF',
      });
      expect(cache.isDeviceInfoComplete('device123')).toBe(false);

      // Second merge - firmware info
      cache.mergeDeviceInfo('device123', {
        fwVer: '1.0.0',
        mask: '255.255.255.0',
        gwIp: '192.168.1.1',
      });
      expect(cache.isDeviceInfoComplete('device123')).toBe(false);

      // Third merge - module info
      cache.mergeDeviceInfo('device123', {
        activeModules: [{ moduleIndex: 1, moduleId: 'mod1', fwVer: '1.0.0', uTotal: 54 }],
      });
      expect(cache.isDeviceInfoComplete('device123')).toBe(true);
    });
  });

  describe('integration with setDeviceInfo and getDeviceInfo', () => {
    it('should update device info accessible via getDeviceInfo after merge', () => {
      cache.mergeDeviceInfo('device123', {
        ip: '192.168.1.100',
        mac: 'AA:BB:CC:DD:EE:FF',
      });

      const retrieved = cache.getDeviceInfo('device123');
      expect(retrieved?.ip).toBe('192.168.1.100');
      expect(retrieved?.mac).toBe('AA:BB:CC:DD:EE:FF');
    });

    it('should work correctly after setDeviceInfo followed by mergeDeviceInfo', () => {
      // Set complete info first
      const completeInfo: DeviceMetadata = {
        deviceId: 'device123',
        deviceType: 'V5008',
        ip: '192.168.1.100',
        mac: 'AA:BB:CC:DD:EE:FF',
        fwVer: '1.0.0',
        mask: '255.255.255.0',
        gwIp: '192.168.1.1',
        lastSeenInfo: new Date().toISOString(),
        activeModules: [{ moduleIndex: 1, moduleId: 'mod1', fwVer: '1.0.0', uTotal: 54 }],
      };
      cache.setDeviceInfo('device123', completeInfo);

      // Then merge a partial update
      cache.mergeDeviceInfo('device123', {
        fwVer: '2.0.0',
        activeModules: [{ moduleIndex: 2, moduleId: 'mod2', fwVer: '2.0.0', uTotal: 60 }],
      });

      const result = cache.getDeviceInfo('device123');
      expect(result?.fwVer).toBe('2.0.0'); // Updated
      expect(result?.ip).toBe('192.168.1.100'); // Preserved
      expect(result?.activeModules).toHaveLength(2); // Merged modules
    });
  });
});
