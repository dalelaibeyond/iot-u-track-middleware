/**
 * Unit tests for SUO Device Info completion check and merge helpers
 */

import {
  SUODevMod,
  DeviceInfoCompletionStatus,
  checkDeviceInfoCompletion,
  mergeSUODevMod,
} from '@t/suo.types';

describe('Device Info Completion Check', () => {
  describe('DeviceInfoCompletionStatus interface', () => {
    it('should have the correct structure', () => {
      const status: DeviceInfoCompletionStatus = {
        isComplete: true,
        missingFields: [],
        missingModuleFields: [],
      };

      expect(status.isComplete).toBe(true);
      expect(status.missingFields).toEqual([]);
      expect(status.missingModuleFields).toEqual([]);
    });

    it('should handle incomplete status', () => {
      const status: DeviceInfoCompletionStatus = {
        isComplete: false,
        missingFields: ['ip', 'mac'],
        missingModuleFields: [{ moduleIndex: 0, fields: ['fwVer'] }],
      };

      expect(status.isComplete).toBe(false);
      expect(status.missingFields).toContain('ip');
      expect(status.missingFields).toContain('mac');
      expect(status.missingModuleFields).toHaveLength(1);
      expect(status.missingModuleFields[0].moduleIndex).toBe(0);
      expect(status.missingModuleFields[0].fields).toContain('fwVer');
    });
  });

  describe('checkDeviceInfoCompletion', () => {
    it('should return complete when all device and module fields are present', () => {
      const devMod: SUODevMod = {
        suoType: 'SUO_DEV_MOD',
        deviceId: 'test-device',
        deviceType: 'V5008',
        serverTimestamp: new Date().toISOString(),
        deviceTimestamp: null,
        messageId: 'test-msg-1',
        ip: '192.168.1.100',
        mask: '255.255.255.0',
        gwIp: '192.168.1.1',
        mac: 'AA:BB:CC:DD:EE:FF',
        model: 'V5008',
        fwVer: '1.0.0',
        modules: [
          { moduleIndex: 0, moduleId: 'mod-0', fwVer: '1.0.0', uTotal: 100 },
          { moduleIndex: 1, moduleId: 'mod-1', fwVer: '1.0.1', uTotal: 200 },
        ],
      };

      const result = checkDeviceInfoCompletion(devMod);

      expect(result.isComplete).toBe(true);
      expect(result.missingFields).toHaveLength(0);
      expect(result.missingModuleFields).toHaveLength(0);
    });

    it('should detect missing device fields', () => {
      const devMod: SUODevMod = {
        suoType: 'SUO_DEV_MOD',
        deviceId: 'test-device',
        deviceType: 'V5008',
        serverTimestamp: new Date().toISOString(),
        deviceTimestamp: null,
        messageId: 'test-msg-2',
        ip: null,
        mask: null,
        gwIp: null,
        mac: null,
        model: 'V5008',
        fwVer: null,
        modules: [],
      };

      const result = checkDeviceInfoCompletion(devMod);

      expect(result.isComplete).toBe(false);
      expect(result.missingFields).toContain('ip');
      expect(result.missingFields).toContain('mac');
      expect(result.missingFields).toContain('fwVer');
      expect(result.missingFields).toContain('mask');
      expect(result.missingFields).toContain('gwIp');
    });

    it('should detect missing module fields', () => {
      const devMod: SUODevMod = {
        suoType: 'SUO_DEV_MOD',
        deviceId: 'test-device',
        deviceType: 'V5008',
        serverTimestamp: new Date().toISOString(),
        deviceTimestamp: null,
        messageId: 'test-msg-3',
        ip: '192.168.1.100',
        mask: '255.255.255.0',
        gwIp: '192.168.1.1',
        mac: 'AA:BB:CC:DD:EE:FF',
        model: 'V5008',
        fwVer: '1.0.0',
        modules: [
          { moduleIndex: 0, moduleId: 'mod-0', fwVer: '1.0.0', uTotal: 100 },
          { moduleIndex: 1, moduleId: '', fwVer: '', uTotal: 0 },
        ],
      };

      const result = checkDeviceInfoCompletion(devMod);

      expect(result.isComplete).toBe(false);
      expect(result.missingModuleFields).toHaveLength(1);
      expect(result.missingModuleFields[0].moduleIndex).toBe(1);
      expect(result.missingModuleFields[0].fields).toContain('moduleId');
      expect(result.missingModuleFields[0].fields).toContain('fwVer');
    });

    it('should handle empty modules array', () => {
      const devMod: SUODevMod = {
        suoType: 'SUO_DEV_MOD',
        deviceId: 'test-device',
        deviceType: 'V5008',
        serverTimestamp: new Date().toISOString(),
        deviceTimestamp: null,
        messageId: 'test-msg-4',
        ip: '192.168.1.100',
        mask: '255.255.255.0',
        gwIp: '192.168.1.1',
        mac: 'AA:BB:CC:DD:EE:FF',
        model: 'V5008',
        fwVer: '1.0.0',
        modules: [],
      };

      const result = checkDeviceInfoCompletion(devMod);

      // Empty modules array means device info is incomplete (needs at least one module)
      expect(result.isComplete).toBe(false);
      expect(result.missingFields).toContain('modules');
    });
  });
});

describe('mergeSUODevMod', () => {
  it('should merge device info with existing non-null values preserved', () => {
    const existing: SUODevMod = {
      suoType: 'SUO_DEV_MOD',
      deviceId: 'test-device',
      deviceType: 'V5008',
      serverTimestamp: new Date().toISOString(),
      deviceTimestamp: null,
      messageId: 'existing-msg',
      ip: '192.168.1.100',
      mask: '255.255.255.0',
      gwIp: '192.168.1.1',
      mac: 'AA:BB:CC:DD:EE:FF',
      model: 'V5008',
      fwVer: '1.0.0',
      modules: [{ moduleIndex: 0, moduleId: 'mod-0', fwVer: '1.0.0', uTotal: 100 }],
    };

    const incoming: SUODevMod = {
      suoType: 'SUO_DEV_MOD',
      deviceId: 'test-device',
      deviceType: 'V5008',
      serverTimestamp: new Date().toISOString(),
      deviceTimestamp: null,
      messageId: 'incoming-msg',
      ip: null,
      mask: null,
      gwIp: null,
      mac: null,
      model: null,
      fwVer: null,
      modules: [],
    };

    const result = mergeSUODevMod(existing, incoming);

    // Existing non-null values should be preserved
    expect(result.ip).toBe('192.168.1.100');
    expect(result.mask).toBe('255.255.255.0');
    expect(result.gwIp).toBe('192.168.1.1');
    expect(result.mac).toBe('AA:BB:CC:DD:EE:FF');
    expect(result.model).toBe('V5008');
    expect(result.fwVer).toBe('1.0.0');
    expect(result.modules).toHaveLength(1);
  });

  it('should override with incoming non-null values', () => {
    const existing: SUODevMod = {
      suoType: 'SUO_DEV_MOD',
      deviceId: 'test-device',
      deviceType: 'V5008',
      serverTimestamp: new Date().toISOString(),
      deviceTimestamp: null,
      messageId: 'existing-msg',
      ip: '192.168.1.100',
      mask: '255.255.255.0',
      gwIp: '192.168.1.1',
      mac: 'AA:BB:CC:DD:EE:FF',
      model: 'V5008',
      fwVer: '1.0.0',
      modules: [],
    };

    const incoming: SUODevMod = {
      suoType: 'SUO_DEV_MOD',
      deviceId: 'test-device',
      deviceType: 'V5008',
      serverTimestamp: new Date().toISOString(),
      deviceTimestamp: null,
      messageId: 'incoming-msg',
      ip: '192.168.1.200',
      mask: '255.255.0.0',
      gwIp: '192.168.0.1',
      mac: '11:22:33:44:55:66',
      model: 'V5008-PRO',
      fwVer: '2.0.0',
      modules: [],
    };

    const result = mergeSUODevMod(existing, incoming);

    // Incoming non-null values should override
    expect(result.ip).toBe('192.168.1.200');
    expect(result.mask).toBe('255.255.0.0');
    expect(result.gwIp).toBe('192.168.0.1');
    expect(result.mac).toBe('11:22:33:44:55:66');
    expect(result.model).toBe('V5008-PRO');
    expect(result.fwVer).toBe('2.0.0');
  });

  it('should merge modules and sort by moduleIndex', () => {
    const existing: SUODevMod = {
      suoType: 'SUO_DEV_MOD',
      deviceId: 'test-device',
      deviceType: 'V5008',
      serverTimestamp: new Date().toISOString(),
      deviceTimestamp: null,
      messageId: 'existing-msg',
      ip: '192.168.1.100',
      mask: '255.255.255.0',
      gwIp: '192.168.1.1',
      mac: 'AA:BB:CC:DD:EE:FF',
      model: 'V5008',
      fwVer: '1.0.0',
      modules: [
        { moduleIndex: 2, moduleId: 'mod-2', fwVer: '1.0.2', uTotal: 300 },
        { moduleIndex: 0, moduleId: 'mod-0', fwVer: '1.0.0', uTotal: 100 },
      ],
    };

    const incoming: SUODevMod = {
      suoType: 'SUO_DEV_MOD',
      deviceId: 'test-device',
      deviceType: 'V5008',
      serverTimestamp: new Date().toISOString(),
      deviceTimestamp: null,
      messageId: 'incoming-msg',
      ip: '192.168.1.100',
      mask: '255.255.255.0',
      gwIp: '192.168.1.1',
      mac: 'AA:BB:CC:DD:EE:FF',
      model: 'V5008',
      fwVer: '1.0.0',
      modules: [
        { moduleIndex: 1, moduleId: 'mod-1', fwVer: '1.0.1', uTotal: 200 },
        { moduleIndex: 2, moduleId: 'mod-2-updated', fwVer: '1.0.3', uTotal: 350 },
      ],
    };

    const result = mergeSUODevMod(existing, incoming);

    // Should have 3 modules (0, 1, 2)
    expect(result.modules).toHaveLength(3);

    // Should be sorted by moduleIndex
    expect(result.modules[0].moduleIndex).toBe(0);
    expect(result.modules[1].moduleIndex).toBe(1);
    expect(result.modules[2].moduleIndex).toBe(2);

    // Module 0 should keep existing values
    expect(result.modules[0].moduleId).toBe('mod-0');
    expect(result.modules[0].fwVer).toBe('1.0.0');
    expect(result.modules[0].uTotal).toBe(100);

    // Module 1 should come from incoming
    expect(result.modules[1].moduleId).toBe('mod-1');
    expect(result.modules[1].fwVer).toBe('1.0.1');
    expect(result.modules[1].uTotal).toBe(200);

    // Module 2 should be overridden by incoming
    expect(result.modules[2].moduleId).toBe('mod-2-updated');
    expect(result.modules[2].fwVer).toBe('1.0.3');
    expect(result.modules[2].uTotal).toBe(350);
  });

  it('should preserve existing module fields when incoming has null/empty values', () => {
    const existing: SUODevMod = {
      suoType: 'SUO_DEV_MOD',
      deviceId: 'test-device',
      deviceType: 'V5008',
      serverTimestamp: new Date().toISOString(),
      deviceTimestamp: null,
      messageId: 'existing-msg',
      ip: '192.168.1.100',
      mask: '255.255.255.0',
      gwIp: '192.168.1.1',
      mac: 'AA:BB:CC:DD:EE:FF',
      model: 'V5008',
      fwVer: '1.0.0',
      modules: [{ moduleIndex: 0, moduleId: 'mod-0', fwVer: '1.0.0', uTotal: 100 }],
    };

    const incoming: SUODevMod = {
      suoType: 'SUO_DEV_MOD',
      deviceId: 'test-device',
      deviceType: 'V5008',
      serverTimestamp: new Date().toISOString(),
      deviceTimestamp: null,
      messageId: 'incoming-msg',
      ip: '192.168.1.100',
      mask: '255.255.255.0',
      gwIp: '192.168.1.1',
      mac: 'AA:BB:CC:DD:EE:FF',
      model: 'V5008',
      fwVer: '1.0.0',
      modules: [{ moduleIndex: 0, moduleId: '', fwVer: '', uTotal: 0 }],
    };

    const result = mergeSUODevMod(existing, incoming);

    // Module should preserve existing values when incoming has empty values
    expect(result.modules[0].moduleId).toBe('mod-0');
    expect(result.modules[0].fwVer).toBe('1.0.0');
    expect(result.modules[0].uTotal).toBe(100);
  });

  it('should update metadata fields from incoming message', () => {
    const existing: SUODevMod = {
      suoType: 'SUO_DEV_MOD',
      deviceId: 'test-device',
      deviceType: 'V5008',
      serverTimestamp: '2024-01-01T00:00:00Z',
      deviceTimestamp: '2024-01-01T00:00:00Z',
      messageId: 'existing-msg',
      ip: '192.168.1.100',
      mask: '255.255.255.0',
      gwIp: '192.168.1.1',
      mac: 'AA:BB:CC:DD:EE:FF',
      model: 'V5008',
      fwVer: '1.0.0',
      modules: [],
    };

    const incoming: SUODevMod = {
      suoType: 'SUO_DEV_MOD',
      deviceId: 'test-device',
      deviceType: 'V5008',
      serverTimestamp: '2024-01-02T00:00:00Z',
      deviceTimestamp: '2024-01-02T00:00:00Z',
      messageId: 'incoming-msg',
      ip: null,
      mask: null,
      gwIp: null,
      mac: null,
      model: null,
      fwVer: null,
      modules: [],
    };

    const result = mergeSUODevMod(existing, incoming);

    // Metadata should be updated from incoming
    expect(result.serverTimestamp).toBe('2024-01-02T00:00:00Z');
    expect(result.deviceTimestamp).toBe('2024-01-02T00:00:00Z');
    expect(result.messageId).toBe('incoming-msg');
  });

  it('should handle merge with no overlapping modules', () => {
    const existing: SUODevMod = {
      suoType: 'SUO_DEV_MOD',
      deviceId: 'test-device',
      deviceType: 'V5008',
      serverTimestamp: new Date().toISOString(),
      deviceTimestamp: null,
      messageId: 'existing-msg',
      ip: '192.168.1.100',
      mask: '255.255.255.0',
      gwIp: '192.168.1.1',
      mac: 'AA:BB:CC:DD:EE:FF',
      model: 'V5008',
      fwVer: '1.0.0',
      modules: [{ moduleIndex: 0, moduleId: 'mod-0', fwVer: '1.0.0', uTotal: 100 }],
    };

    const incoming: SUODevMod = {
      suoType: 'SUO_DEV_MOD',
      deviceId: 'test-device',
      deviceType: 'V5008',
      serverTimestamp: new Date().toISOString(),
      deviceTimestamp: null,
      messageId: 'incoming-msg',
      ip: null,
      mask: null,
      gwIp: null,
      mac: null,
      model: null,
      fwVer: null,
      modules: [
        { moduleIndex: 1, moduleId: 'mod-1', fwVer: '1.0.1', uTotal: 200 },
        { moduleIndex: 2, moduleId: 'mod-2', fwVer: '1.0.2', uTotal: 300 },
      ],
    };

    const result = mergeSUODevMod(existing, incoming);

    // Should have all 3 modules
    expect(result.modules).toHaveLength(3);
    expect(result.modules[0].moduleIndex).toBe(0);
    expect(result.modules[1].moduleIndex).toBe(1);
    expect(result.modules[2].moduleIndex).toBe(2);
  });

  it('should handle empty modules arrays', () => {
    const existing: SUODevMod = {
      suoType: 'SUO_DEV_MOD',
      deviceId: 'test-device',
      deviceType: 'V5008',
      serverTimestamp: new Date().toISOString(),
      deviceTimestamp: null,
      messageId: 'existing-msg',
      ip: '192.168.1.100',
      mask: '255.255.255.0',
      gwIp: '192.168.1.1',
      mac: 'AA:BB:CC:DD:EE:FF',
      model: 'V5008',
      fwVer: '1.0.0',
      modules: [],
    };

    const incoming: SUODevMod = {
      suoType: 'SUO_DEV_MOD',
      deviceId: 'test-device',
      deviceType: 'V5008',
      serverTimestamp: new Date().toISOString(),
      deviceTimestamp: null,
      messageId: 'incoming-msg',
      ip: null,
      mask: null,
      gwIp: null,
      mac: null,
      model: null,
      fwVer: null,
      modules: [],
    };

    const result = mergeSUODevMod(existing, incoming);

    expect(result.modules).toHaveLength(0);
  });
});
