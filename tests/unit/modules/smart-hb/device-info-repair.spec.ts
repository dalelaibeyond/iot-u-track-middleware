/**
 * Device Info Repair Tests
 */

import { DeviceInfoRepair, DeviceInfoRepairConfig } from '@modules/smart-hb/device-info-repair';
import { UOSCache } from '@modules/cache';
import { SUODevMod } from '@t/suo.types';
import { eventBus, SystemEvents } from '@core/event-bus';

// Mock the event bus
jest.mock('@core/event-bus', () => ({
  eventBus: {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  },
  SystemEvents: {
    COMMAND_PUBLISH: 'command.publish',
    SUO_MQTT_MESSAGE: 'suo.mqtt.message',
  },
}));

describe('DeviceInfoRepair', () => {
  let repair: DeviceInfoRepair;
  let cache: UOSCache;
  let config: DeviceInfoRepairConfig;

  beforeEach(() => {
    cache = new UOSCache({ maxSize: 100 });
    config = {
      queryCooldown: 5000, // 5 seconds for testing
      enableRepair: true,
    };
    repair = new DeviceInfoRepair(config, cache);
    jest.clearAllMocks();
  });

  afterEach(() => {
    cache.dispose();
    repair.clear();
  });

  describe('processDevMod', () => {
    it('should merge partial device info and update cache', () => {
      const partialDevMod: SUODevMod = {
        suoType: 'SUO_DEV_MOD',
        deviceId: 'test-device',
        deviceType: 'V5008',
        serverTimestamp: new Date().toISOString(),
        deviceTimestamp: null,
        messageId: 'msg-1',
        ip: '192.168.1.100',
        mask: null,
        gwIp: null,
        mac: 'AA:BB:CC:DD:EE:FF',
        model: null,
        fwVer: '1.0.0',
        modules: [],
      };

      repair.processDevMod(partialDevMod);

      // Check cache was updated
      const deviceInfo = cache.getDeviceInfo('test-device');
      expect(deviceInfo).not.toBeNull();
      expect(deviceInfo?.ip).toBe('192.168.1.100');
      expect(deviceInfo?.mac).toBe('AA:BB:CC:DD:EE:FF');
      expect(deviceInfo?.fwVer).toBe('1.0.0');
    });

    it('should mark device as incomplete when missing fields', () => {
      const partialDevMod: SUODevMod = {
        suoType: 'SUO_DEV_MOD',
        deviceId: 'test-device',
        deviceType: 'V5008',
        serverTimestamp: new Date().toISOString(),
        deviceTimestamp: null,
        messageId: 'msg-1',
        ip: '192.168.1.100',
        mask: null,
        gwIp: null,
        mac: null, // Missing
        model: null,
        fwVer: null, // Missing
        modules: [],
      };

      repair.processDevMod(partialDevMod);

      expect(repair.isDeviceInfoComplete('test-device')).toBe(false);
    });

    it('should emit SUO_MQTT_MESSAGE when device info becomes complete', () => {
      const completeDevMod: SUODevMod = {
        suoType: 'SUO_DEV_MOD',
        deviceId: 'test-device',
        deviceType: 'V6800',
        serverTimestamp: new Date().toISOString(),
        deviceTimestamp: null,
        messageId: 'msg-1',
        ip: '192.168.1.100',
        mask: '255.255.255.0',
        gwIp: '192.168.1.1',
        mac: 'AA:BB:CC:DD:EE:FF',
        model: 'V6800-Test',
        fwVer: '2.0.0',
        modules: [{ moduleIndex: 0, moduleId: 'MOD-1', fwVer: '1.0', uTotal: 16 }],
      };

      repair.processDevMod(completeDevMod);

      expect(repair.isDeviceInfoComplete('test-device')).toBe(true);
      expect(eventBus.emit).toHaveBeenCalledWith(
        SystemEvents.SUO_MQTT_MESSAGE,
        expect.objectContaining({
          message: expect.objectContaining({
            deviceId: 'test-device',
            suoType: 'SUO_DEV_MOD',
          }),
        })
      );
    });

    it('should merge multiple partial updates', () => {
      const firstUpdate: SUODevMod = {
        suoType: 'SUO_DEV_MOD',
        deviceId: 'test-device',
        deviceType: 'V5008',
        serverTimestamp: new Date().toISOString(),
        deviceTimestamp: null,
        messageId: 'msg-1',
        ip: '192.168.1.100',
        mask: null,
        gwIp: null,
        mac: 'AA:BB:CC:DD:EE:FF',
        model: null,
        fwVer: '1.0.0',
        modules: [],
      };

      const secondUpdate: SUODevMod = {
        suoType: 'SUO_DEV_MOD',
        deviceId: 'test-device',
        deviceType: 'V5008',
        serverTimestamp: new Date().toISOString(),
        deviceTimestamp: null,
        messageId: 'msg-2',
        ip: null, // Should not overwrite
        mask: '255.255.255.0',
        gwIp: '192.168.1.1',
        mac: null, // Should not overwrite
        model: 'V5008-Pro',
        fwVer: null, // Should not overwrite
        modules: [{ moduleIndex: 0, moduleId: 'MOD-1', fwVer: '1.0', uTotal: 8 }],
      };

      repair.processDevMod(firstUpdate);
      repair.processDevMod(secondUpdate);

      const state = repair.getDeviceState('test-device');
      expect(state?.partialDevMod?.ip).toBe('192.168.1.100');
      expect(state?.partialDevMod?.mask).toBe('255.255.255.0');
      expect(state?.partialDevMod?.gwIp).toBe('192.168.1.1');
      expect(state?.partialDevMod?.mac).toBe('AA:BB:CC:DD:EE:FF');
      expect(state?.partialDevMod?.modules).toHaveLength(1);
    });

    it('should not process when repair is disabled', () => {
      const disabledConfig: DeviceInfoRepairConfig = {
        queryCooldown: 5000,
        enableRepair: false,
      };
      const disabledRepair = new DeviceInfoRepair(disabledConfig, cache);

      const devMod: SUODevMod = {
        suoType: 'SUO_DEV_MOD',
        deviceId: 'test-device',
        deviceType: 'V5008',
        serverTimestamp: new Date().toISOString(),
        deviceTimestamp: null,
        messageId: 'msg-1',
        ip: '192.168.1.100',
        mask: null,
        gwIp: null,
        mac: 'AA:BB:CC:DD:EE:FF',
        model: null,
        fwVer: '1.0.0',
        modules: [],
      };

      disabledRepair.processDevMod(devMod);

      // Should not create device state
      expect(disabledRepair.getDeviceState('test-device')).toBeUndefined();
    });
  });

  describe('processHeartbeat', () => {
    it('should convert heartbeat to partial DevMod and process', () => {
      const modules = [
        { moduleIndex: 0, moduleId: 'MOD-1', uTotal: 8 },
        { moduleIndex: 1, moduleId: 'MOD-2', uTotal: 16 },
      ];

      repair.processHeartbeat('test-device', 'V5008', modules);

      const state = repair.getDeviceState('test-device');
      expect(state).toBeDefined();
      expect(state?.partialDevMod?.modules).toHaveLength(2);
      expect(state?.partialDevMod?.modules[0].moduleIndex).toBe(0);
      expect(state?.partialDevMod?.modules[0].uTotal).toBe(8);
    });

    it('should not process when repair is disabled', () => {
      const disabledConfig: DeviceInfoRepairConfig = {
        queryCooldown: 5000,
        enableRepair: false,
      };
      const disabledRepair = new DeviceInfoRepair(disabledConfig, cache);

      const modules = [{ moduleIndex: 0, moduleId: 'MOD-1', uTotal: 8 }];

      disabledRepair.processHeartbeat('test-device', 'V5008', modules);

      expect(disabledRepair.getDeviceState('test-device')).toBeUndefined();
    });
  });

  describe('query behavior', () => {
    it('should query device info when incomplete', () => {
      const incompleteDevMod: SUODevMod = {
        suoType: 'SUO_DEV_MOD',
        deviceId: 'test-device',
        deviceType: 'V5008',
        serverTimestamp: new Date().toISOString(),
        deviceTimestamp: null,
        messageId: 'msg-1',
        ip: null,
        mask: null,
        gwIp: null,
        mac: null,
        model: null,
        fwVer: null,
        modules: [],
      };

      repair.processDevMod(incompleteDevMod);

      // Should emit command for device info query
      expect(eventBus.emit).toHaveBeenCalledWith(
        SystemEvents.COMMAND_PUBLISH,
        expect.objectContaining({
          topic: 'V5008Download/test-device',
          payload: expect.any(Buffer),
        })
      );
    });

    it('should query module info when missing', () => {
      const devModWithModule: SUODevMod = {
        suoType: 'SUO_DEV_MOD',
        deviceId: 'test-device',
        deviceType: 'V5008',
        serverTimestamp: new Date().toISOString(),
        deviceTimestamp: null,
        messageId: 'msg-1',
        ip: '192.168.1.100',
        mask: '255.255.255.0',
        gwIp: '192.168.1.1',
        mac: 'AA:BB:CC:DD:EE:FF',
        model: 'V5008-Pro',
        fwVer: '1.0.0',
        modules: [
          { moduleIndex: 0, moduleId: '', fwVer: '', uTotal: 0 }, // Incomplete module
        ],
      };

      repair.processDevMod(devModWithModule);

      // Should emit command for module info query
      const calls = (eventBus.emit as jest.Mock).mock.calls;
      const moduleQueryCall = calls.find(
        call =>
          call[0] === SystemEvents.COMMAND_PUBLISH && call[1].topic === 'V5008Download/test-device'
      );
      expect(moduleQueryCall).toBeDefined();
    });

    it('should use V6800 commands for V6800 devices', () => {
      const incompleteDevMod: SUODevMod = {
        suoType: 'SUO_DEV_MOD',
        deviceId: 'v6800-device',
        deviceType: 'V6800',
        serverTimestamp: new Date().toISOString(),
        deviceTimestamp: null,
        messageId: 'msg-1',
        ip: null,
        mask: null,
        gwIp: null,
        mac: null,
        model: null,
        fwVer: null,
        modules: [],
      };

      repair.processDevMod(incompleteDevMod);

      expect(eventBus.emit).toHaveBeenCalledWith(
        SystemEvents.COMMAND_PUBLISH,
        expect.objectContaining({
          topic: 'V6800Download/v6800-device',
          payload: expect.any(Buffer),
        })
      );

      // Check that payload is JSON for V6800
      const calls = (eventBus.emit as jest.Mock).mock.calls;
      const v6800Call = calls.find(
        call =>
          call[0] === SystemEvents.COMMAND_PUBLISH && call[1].topic === 'V6800Download/v6800-device'
      );
      const payload = v6800Call[1].payload.toString();
      const jsonPayload = JSON.parse(payload);
      expect(jsonPayload.msg_type).toBe('get_device_info_req');
    });
  });

  describe('cooldown behavior', () => {
    it('should respect cooldown for duplicate queries', () => {
      const incompleteDevMod: SUODevMod = {
        suoType: 'SUO_DEV_MOD',
        deviceId: 'test-device',
        deviceType: 'V5008',
        serverTimestamp: new Date().toISOString(),
        deviceTimestamp: null,
        messageId: 'msg-1',
        ip: null,
        mask: null,
        gwIp: null,
        mac: null,
        model: null,
        fwVer: null,
        modules: [],
      };

      // First call should trigger query
      repair.processDevMod(incompleteDevMod);
      const firstCallCount = (eventBus.emit as jest.Mock).mock.calls.length;

      // Second call immediately should not trigger another query
      repair.processDevMod(incompleteDevMod);
      const secondCallCount = (eventBus.emit as jest.Mock).mock.calls.length;

      expect(secondCallCount).toBe(firstCallCount);
    });
  });

  describe('clear', () => {
    it('should clear all device states', () => {
      const devMod: SUODevMod = {
        suoType: 'SUO_DEV_MOD',
        deviceId: 'device-1',
        deviceType: 'V5008',
        serverTimestamp: new Date().toISOString(),
        deviceTimestamp: null,
        messageId: 'msg-1',
        ip: '192.168.1.100',
        mask: null,
        gwIp: null,
        mac: 'AA:BB:CC:DD:EE:FF',
        model: null,
        fwVer: '1.0.0',
        modules: [],
      };

      repair.processDevMod(devMod);
      expect(repair.getDeviceState('device-1')).toBeDefined();

      repair.clear();
      expect(repair.getDeviceState('device-1')).toBeUndefined();
    });
  });

  describe('SmartHB stopPropagation integration', () => {
    it('should NOT emit SUO_MQTT_MESSAGE for incomplete initial messages', () => {
      const incompleteDevMod: SUODevMod = {
        suoType: 'SUO_DEV_MOD',
        deviceId: 'test-device',
        deviceType: 'V5008',
        serverTimestamp: new Date().toISOString(),
        deviceTimestamp: null,
        messageId: 'msg-1',
        ip: null,
        mask: null,
        gwIp: null,
        mac: null,
        model: null,
        fwVer: null,
        modules: [],
      };

      repair.processDevMod(incompleteDevMod);

      // Should NOT emit SUO_MQTT_MESSAGE for incomplete messages
      const suoCalls = (eventBus.emit as jest.Mock).mock.calls.filter(
        call => call[0] === SystemEvents.SUO_MQTT_MESSAGE
      );
      expect(suoCalls).toHaveLength(0);
    });

    it('should emit SUO_MQTT_MESSAGE only when message becomes complete', () => {
      // First message - incomplete (only device info)
      const deviceInfoPartial: SUODevMod = {
        suoType: 'SUO_DEV_MOD',
        deviceId: 'test-device',
        deviceType: 'V5008',
        serverTimestamp: new Date().toISOString(),
        deviceTimestamp: null,
        messageId: 'msg-1',
        ip: '192.168.1.100',
        mask: '255.255.255.0',
        gwIp: '192.168.1.1',
        mac: 'AA:BB:CC:DD:EE:FF',
        model: 'V5008-Pro',
        fwVer: '1.0.0',
        modules: [], // No modules yet
      };

      repair.processDevMod(deviceInfoPartial);

      // No SUO_MQTT_MESSAGE yet
      expect(
        (eventBus.emit as jest.Mock).mock.calls.filter(
          call => call[0] === SystemEvents.SUO_MQTT_MESSAGE
        )
      ).toHaveLength(0);

      // Second message - adds modules (now complete)
      const moduleInfoPartial: SUODevMod = {
        suoType: 'SUO_DEV_MOD',
        deviceId: 'test-device',
        deviceType: 'V5008',
        serverTimestamp: new Date().toISOString(),
        deviceTimestamp: null,
        messageId: 'msg-2',
        ip: null, // Should merge and keep previous
        mask: null,
        gwIp: null,
        mac: null,
        model: null,
        fwVer: null,
        modules: [{ moduleIndex: 0, moduleId: 'MOD-1', fwVer: '1.0', uTotal: 8 }],
      };

      repair.processDevMod(moduleInfoPartial);

      // NOW should emit SUO_MQTT_MESSAGE because it's complete
      const suoCalls = (eventBus.emit as jest.Mock).mock.calls.filter(
        call => call[0] === SystemEvents.SUO_MQTT_MESSAGE
      );
      expect(suoCalls).toHaveLength(1);
      expect(suoCalls[0][1].message.deviceId).toBe('test-device');
      expect(suoCalls[0][1].message.ip).toBe('192.168.1.100');
      expect(suoCalls[0][1].message.modules).toHaveLength(1);
    });

    it('should handle complete message on first arrival', () => {
      const completeDevMod: SUODevMod = {
        suoType: 'SUO_DEV_MOD',
        deviceId: 'complete-device',
        deviceType: 'V6800',
        serverTimestamp: new Date().toISOString(),
        deviceTimestamp: null,
        messageId: 'msg-1',
        ip: '192.168.1.100',
        mask: '255.255.255.0',
        gwIp: '192.168.1.1',
        mac: 'AA:BB:CC:DD:EE:FF',
        model: 'V6800-Pro',
        fwVer: '2.0.0',
        modules: [{ moduleIndex: 0, moduleId: 'MOD-1', fwVer: '1.0', uTotal: 16 }],
      };

      repair.processDevMod(completeDevMod);

      // Should emit SUO_MQTT_MESSAGE immediately for complete messages
      const suoCalls = (eventBus.emit as jest.Mock).mock.calls.filter(
        call => call[0] === SystemEvents.SUO_MQTT_MESSAGE
      );
      expect(suoCalls).toHaveLength(1);
    });
  });
});
