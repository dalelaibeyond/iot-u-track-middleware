/**
 * Protocol Adapter Module Tests
 *
 * Comprehensive tests for the ProtocolAdapter main class.
 * Tests event subscription, routing, lifecycle, and configuration management.
 */

import {
  ProtocolAdapterModule,
  ProtocolAdapterConfig,
} from '@modules/protocol-adapter/protocol-adapter';
import { RFIDUnifier } from '@modules/protocol-adapter/rfid-unifier';
import { IUOSCache } from '@t/uos.types';
import { SUORfidSnapshot, SUORfidEvent } from '@t/suo.types';
import { SUOMessageEvent } from '@t/event.types';
import { eventBus, SystemEvents } from '@core/event-bus';

// Mock the event bus
jest.mock('@core/event-bus', () => ({
  eventBus: {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  },
  SystemEvents: {
    SUO_MQTT_MESSAGE: 'suo.mqtt.message',
    COMMAND_PUBLISH: 'command.publish',
  },
}));

// Mock the RFIDUnifier
jest.mock('@modules/protocol-adapter/rfid-unifier', () => ({
  RFIDUnifier: jest.fn().mockImplementation(() => ({
    processV5008Snapshot: jest.fn(),
    processV6800Snapshot: jest.fn(),
    processV6800Event: jest.fn(),
    updateConfig: jest.fn(),
    clearDedupWindow: jest.fn(),
    getDedupWindowSize: jest.fn().mockReturnValue(0),
  })),
}));

describe('ProtocolAdapterModule', () => {
  let adapter: ProtocolAdapterModule;
  let mockCache: jest.Mocked<IUOSCache>;
  let config: ProtocolAdapterConfig;

  beforeEach(() => {
    // Create mock cache
    mockCache = {
      setModule: jest.fn(),
      getModule: jest.fn().mockReturnValue(null),
      getAllModules: jest.fn().mockReturnValue([]),
      setDeviceInfo: jest.fn(),
      getDeviceInfo: jest.fn().mockReturnValue(null),
      mergeDeviceInfo: jest.fn(),
      isDeviceInfoComplete: jest.fn().mockReturnValue(false),
      delete: jest.fn().mockReturnValue(true),
      clear: jest.fn(),
      getStats: jest.fn().mockReturnValue({
        size: 0,
        maxSize: 1000,
        maxQueueSize: 100,
        hitCount: 0,
        missCount: 0,
        evictionCount: 0,
        queuedOperations: 0,
      }),
      getAllDeviceIds: jest.fn().mockReturnValue([]),
      getAllEntries: jest.fn().mockReturnValue([]),
    } as jest.Mocked<IUOSCache>;

    config = {
      enabled: true,
      dedupWindowMs: 5000,
    };

    adapter = new ProtocolAdapterModule(config, mockCache);
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Ensure adapter is stopped after each test
    if (adapter.isActive()) {
      adapter.stop();
    }
  });

  describe('start()', () => {
    it('should subscribe to SUO_MQTT_MESSAGE events', () => {
      adapter.start();

      expect(eventBus.on).toHaveBeenCalledTimes(1);
      expect(eventBus.on).toHaveBeenCalledWith(SystemEvents.SUO_MQTT_MESSAGE, expect.any(Function));
    });

    it('should set isRunning to true after starting', () => {
      expect(adapter.isActive()).toBe(false);

      adapter.start();

      expect(adapter.isActive()).toBe(true);
    });

    it('should not start if already running', () => {
      adapter.start();
      expect(eventBus.on).toHaveBeenCalledTimes(1);
      expect(adapter.isActive()).toBe(true);

      jest.clearAllMocks();

      // Try to start again
      adapter.start();

      // Should not subscribe again
      expect(eventBus.on).not.toHaveBeenCalled();
      expect(adapter.isActive()).toBe(true);
    });

    it('should not start if disabled', () => {
      const disabledConfig: ProtocolAdapterConfig = {
        enabled: false,
        dedupWindowMs: 5000,
      };

      // Clear mocks before creating disabled adapter
      jest.clearAllMocks();

      const disabledAdapter = new ProtocolAdapterModule(disabledConfig, mockCache);

      disabledAdapter.start();

      expect(eventBus.on).not.toHaveBeenCalled();
      expect(disabledAdapter.isActive()).toBe(false);
    });

    it('should initialize RFIDUnifier with correct config', () => {
      // Clear mocks to count only constructor calls
      jest.clearAllMocks();

      // Create new adapter to verify constructor behavior
      const testAdapter = new ProtocolAdapterModule(config, mockCache);

      // RFIDUnifier is created in constructor
      expect(RFIDUnifier).toHaveBeenCalledTimes(1);
      expect(RFIDUnifier).toHaveBeenCalledWith({ dedupWindowMs: config.dedupWindowMs }, mockCache);

      // Clean up
      testAdapter.stop();
    });
  });

  describe('stop()', () => {
    it('should unsubscribe from SUO_MQTT_MESSAGE events', () => {
      adapter.start();
      expect(adapter.isActive()).toBe(true);

      jest.clearAllMocks();

      adapter.stop();

      expect(eventBus.off).toHaveBeenCalledTimes(1);
      expect(eventBus.off).toHaveBeenCalledWith(
        SystemEvents.SUO_MQTT_MESSAGE,
        expect.any(Function)
      );
    });

    it('should set isRunning to false after stopping', () => {
      adapter.start();
      expect(adapter.isActive()).toBe(true);

      adapter.stop();

      expect(adapter.isActive()).toBe(false);
    });

    it('should not stop if not running', () => {
      expect(adapter.isActive()).toBe(false);

      adapter.stop();

      expect(eventBus.off).not.toHaveBeenCalled();
      expect(adapter.isActive()).toBe(false);
    });

    it('should be idempotent - calling stop twice is safe', () => {
      adapter.start();
      adapter.stop();

      expect(eventBus.off).toHaveBeenCalledTimes(1);

      // Call stop again
      adapter.stop();

      // Should not call off again
      expect(eventBus.off).toHaveBeenCalledTimes(1);
    });
  });

  describe('isActive()', () => {
    it('should return false when not started', () => {
      expect(adapter.isActive()).toBe(false);
    });

    it('should return true when started', () => {
      adapter.start();
      expect(adapter.isActive()).toBe(true);
    });

    it('should return false after stopped', () => {
      adapter.start();
      expect(adapter.isActive()).toBe(true);

      adapter.stop();
      expect(adapter.isActive()).toBe(false);
    });
  });

  describe('event routing logic', () => {
    beforeEach(() => {
      adapter.start();
    });

    it('should route V5008 RFID_SNAPSHOT to processV5008Snapshot', () => {
      const snapshot: SUORfidSnapshot = {
        suoType: 'SUO_RFID_SNAPSHOT',
        deviceId: 'test-device',
        deviceType: 'V5008',
        moduleIndex: 1,
        moduleId: 'MOD-001',
        serverTimestamp: new Date().toISOString(),
        deviceTimestamp: null,
        messageId: 'msg-1',
        data: {
          sensors: [{ sensorIndex: 0, tagId: 'TAG-001', isAlarm: false }],
        },
      };

      const event: SUOMessageEvent = {
        message: snapshot,
        sif: {} as any,
      };

      // Get the registered handler and call it
      const registeredHandler = (eventBus.on as jest.Mock).mock.calls[0][1];
      registeredHandler(event);

      const rfidUnifier = adapter.getRfidUnifier();
      expect(rfidUnifier.processV5008Snapshot).toHaveBeenCalledWith(snapshot);
      expect(rfidUnifier.processV6800Snapshot).not.toHaveBeenCalled();
      expect(rfidUnifier.processV6800Event).not.toHaveBeenCalled();
    });

    it('should route V6800 RFID_SNAPSHOT to processV6800Snapshot', () => {
      const snapshot: SUORfidSnapshot = {
        suoType: 'SUO_RFID_SNAPSHOT',
        deviceId: 'test-device',
        deviceType: 'V6800',
        moduleIndex: 1,
        moduleId: 'MOD-001',
        serverTimestamp: new Date().toISOString(),
        deviceTimestamp: null,
        messageId: 'msg-1',
        data: {
          sensors: [{ sensorIndex: 0, tagId: 'TAG-001', isAlarm: false }],
        },
      };

      const event: SUOMessageEvent = {
        message: snapshot,
        sif: {} as any,
      };

      const registeredHandler = (eventBus.on as jest.Mock).mock.calls[0][1];
      registeredHandler(event);

      const rfidUnifier = adapter.getRfidUnifier();
      expect(rfidUnifier.processV6800Snapshot).toHaveBeenCalledWith(snapshot);
      expect(rfidUnifier.processV5008Snapshot).not.toHaveBeenCalled();
      expect(rfidUnifier.processV6800Event).not.toHaveBeenCalled();
    });

    it('should route V6800 RFID_EVENT to processV6800Event', () => {
      const rfidEvent: SUORfidEvent = {
        suoType: 'SUO_RFID_EVENT',
        deviceId: 'test-device',
        deviceType: 'V6800',
        moduleIndex: 1,
        moduleId: 'MOD-001',
        serverTimestamp: new Date().toISOString(),
        deviceTimestamp: null,
        messageId: 'msg-1',
        data: {
          sensorIndex: 0,
          tagId: 'TAG-001',
          action: 'ATTACHED',
          isAlarm: false,
        },
      };

      const event: SUOMessageEvent = {
        message: rfidEvent,
        sif: {} as any,
      };

      const registeredHandler = (eventBus.on as jest.Mock).mock.calls[0][1];
      registeredHandler(event);

      const rfidUnifier = adapter.getRfidUnifier();
      expect(rfidUnifier.processV6800Event).toHaveBeenCalledWith(rfidEvent);
      expect(rfidUnifier.processV5008Snapshot).not.toHaveBeenCalled();
      expect(rfidUnifier.processV6800Snapshot).not.toHaveBeenCalled();
    });

    it('should handle non-RFID messages gracefully', () => {
      const nonRfidMessage = {
        suoType: 'SUO_HEARTBEAT',
        deviceId: 'test-device',
        deviceType: 'V5008',
        moduleIndex: null,
        moduleId: null,
        serverTimestamp: new Date().toISOString(),
        deviceTimestamp: null,
        messageId: 'msg-1',
        data: {
          modules: [],
        },
      };

      const event: SUOMessageEvent = {
        message: nonRfidMessage as any,
        sif: {} as any,
      };

      const registeredHandler = (eventBus.on as jest.Mock).mock.calls[0][1];

      // Should not throw
      expect(() => registeredHandler(event)).not.toThrow();

      const rfidUnifier = adapter.getRfidUnifier();
      expect(rfidUnifier.processV5008Snapshot).not.toHaveBeenCalled();
      expect(rfidUnifier.processV6800Snapshot).not.toHaveBeenCalled();
      expect(rfidUnifier.processV6800Event).not.toHaveBeenCalled();
    });

    it('should handle unknown device type for RFID_SNAPSHOT', () => {
      const snapshot: SUORfidSnapshot = {
        suoType: 'SUO_RFID_SNAPSHOT',
        deviceId: 'test-device',
        deviceType: 'UNKNOWN' as any,
        moduleIndex: 1,
        moduleId: 'MOD-001',
        serverTimestamp: new Date().toISOString(),
        deviceTimestamp: null,
        messageId: 'msg-1',
        data: {
          sensors: [{ sensorIndex: 0, tagId: 'TAG-001', isAlarm: false }],
        },
      };

      const event: SUOMessageEvent = {
        message: snapshot,
        sif: {} as any,
      };

      const registeredHandler = (eventBus.on as jest.Mock).mock.calls[0][1];

      // Should not throw, but log warning
      expect(() => registeredHandler(event)).not.toThrow();

      const rfidUnifier = adapter.getRfidUnifier();
      expect(rfidUnifier.processV5008Snapshot).not.toHaveBeenCalled();
      expect(rfidUnifier.processV6800Snapshot).not.toHaveBeenCalled();
    });

    it('should handle V5008 RFID_EVENT gracefully', () => {
      const rfidEvent: SUORfidEvent = {
        suoType: 'SUO_RFID_EVENT',
        deviceId: 'test-device',
        deviceType: 'V5008' as any,
        moduleIndex: 1,
        moduleId: 'MOD-001',
        serverTimestamp: new Date().toISOString(),
        deviceTimestamp: null,
        messageId: 'msg-1',
        data: {
          sensorIndex: 0,
          tagId: 'TAG-001',
          action: 'ATTACHED',
          isAlarm: false,
        },
      };

      const event: SUOMessageEvent = {
        message: rfidEvent,
        sif: {} as any,
      };

      const registeredHandler = (eventBus.on as jest.Mock).mock.calls[0][1];

      // Should not throw, but log warning
      expect(() => registeredHandler(event)).not.toThrow();

      const rfidUnifier = adapter.getRfidUnifier();
      expect(rfidUnifier.processV6800Event).not.toHaveBeenCalled();
    });
  });

  describe('config management', () => {
    it('should return current config with getConfig()', () => {
      const currentConfig = adapter.getConfig();

      expect(currentConfig).toEqual(config);
      // Verify it's a copy, not the original
      expect(currentConfig).not.toBe(config);
    });

    it('should update config with updateConfig()', () => {
      const newConfig: Partial<ProtocolAdapterConfig> = {
        enabled: false,
      };

      adapter.updateConfig(newConfig);

      const currentConfig = adapter.getConfig();
      expect(currentConfig.enabled).toBe(false);
      expect(currentConfig.dedupWindowMs).toBe(config.dedupWindowMs); // Unchanged
    });

    it('should update dedupWindowMs and update RFIDUnifier config in-place', () => {
      const originalUnifier = adapter.getRfidUnifier();
      const initialCallCount = (RFIDUnifier as jest.Mock).mock.calls.length;

      const newConfig: Partial<ProtocolAdapterConfig> = {
        dedupWindowMs: 10000,
      };

      adapter.updateConfig(newConfig);

      const currentConfig = adapter.getConfig();
      expect(currentConfig.dedupWindowMs).toBe(10000);

      // RFIDUnifier should NOT be recreated - config updated in-place to preserve state
      expect(RFIDUnifier).toHaveBeenCalledTimes(initialCallCount);

      // updateConfig should be called on existing instance to update config in-place
      expect(originalUnifier.updateConfig).toHaveBeenCalledWith({ dedupWindowMs: 10000 });

      // Should be the same instance
      expect(adapter.getRfidUnifier()).toBe(originalUnifier);
    });

    it('should not recreate RFIDUnifier if dedupWindowMs is unchanged', () => {
      const originalUnifier = adapter.getRfidUnifier();
      const rfidUnifierCalls = (RFIDUnifier as jest.Mock).mock.calls.length;

      const newConfig: Partial<ProtocolAdapterConfig> = {
        enabled: false,
      };

      adapter.updateConfig(newConfig);

      // RFIDUnifier should not be recreated
      expect(RFIDUnifier).toHaveBeenCalledTimes(rfidUnifierCalls);
      expect(adapter.getRfidUnifier()).toBe(originalUnifier);
    });

    it('should handle multiple config updates', () => {
      adapter.updateConfig({ enabled: false });
      adapter.updateConfig({ dedupWindowMs: 3000 });
      adapter.updateConfig({ enabled: true });

      const currentConfig = adapter.getConfig();
      expect(currentConfig.enabled).toBe(true);
      expect(currentConfig.dedupWindowMs).toBe(3000);
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      adapter.start();
    });

    it('should handle errors in message processing gracefully', () => {
      const rfidUnifier = adapter.getRfidUnifier();

      // Make processV5008Snapshot throw an error
      (rfidUnifier.processV5008Snapshot as jest.Mock).mockImplementation(() => {
        throw new Error('Processing error');
      });

      const snapshot: SUORfidSnapshot = {
        suoType: 'SUO_RFID_SNAPSHOT',
        deviceId: 'test-device',
        deviceType: 'V5008',
        moduleIndex: 1,
        moduleId: 'MOD-001',
        serverTimestamp: new Date().toISOString(),
        deviceTimestamp: null,
        messageId: 'msg-1',
        data: {
          sensors: [{ sensorIndex: 0, tagId: 'TAG-001', isAlarm: false }],
        },
      };

      const event: SUOMessageEvent = {
        message: snapshot,
        sif: {} as any,
      };

      const registeredHandler = (eventBus.on as jest.Mock).mock.calls[0][1];

      // Should not throw, but catch and log error
      expect(() => registeredHandler(event)).not.toThrow();

      // Adapter should still be active
      expect(adapter.isActive()).toBe(true);
    });

    it('should handle errors in V6800 snapshot processing', () => {
      const rfidUnifier = adapter.getRfidUnifier();

      (rfidUnifier.processV6800Snapshot as jest.Mock).mockImplementation(() => {
        throw new Error('V6800 processing error');
      });

      const snapshot: SUORfidSnapshot = {
        suoType: 'SUO_RFID_SNAPSHOT',
        deviceId: 'test-device',
        deviceType: 'V6800',
        moduleIndex: 1,
        moduleId: 'MOD-001',
        serverTimestamp: new Date().toISOString(),
        deviceTimestamp: null,
        messageId: 'msg-1',
        data: {
          sensors: [{ sensorIndex: 0, tagId: 'TAG-001', isAlarm: false }],
        },
      };

      const event: SUOMessageEvent = {
        message: snapshot,
        sif: {} as any,
      };

      const registeredHandler = (eventBus.on as jest.Mock).mock.calls[0][1];

      expect(() => registeredHandler(event)).not.toThrow();
      expect(adapter.isActive()).toBe(true);
    });

    it('should handle errors in V6800 event processing', () => {
      const rfidUnifier = adapter.getRfidUnifier();

      (rfidUnifier.processV6800Event as jest.Mock).mockImplementation(() => {
        throw new Error('V6800 event processing error');
      });

      const rfidEvent: SUORfidEvent = {
        suoType: 'SUO_RFID_EVENT',
        deviceId: 'test-device',
        deviceType: 'V6800',
        moduleIndex: 1,
        moduleId: 'MOD-001',
        serverTimestamp: new Date().toISOString(),
        deviceTimestamp: null,
        messageId: 'msg-1',
        data: {
          sensorIndex: 0,
          tagId: 'TAG-001',
          action: 'ATTACHED',
          isAlarm: false,
        },
      };

      const event: SUOMessageEvent = {
        message: rfidEvent,
        sif: {} as any,
      };

      const registeredHandler = (eventBus.on as jest.Mock).mock.calls[0][1];

      expect(() => registeredHandler(event)).not.toThrow();
      expect(adapter.isActive()).toBe(true);
    });

    it('should handle malformed message data', () => {
      const event: SUOMessageEvent = {
        message: null as any,
        sif: {} as any,
      };

      const registeredHandler = (eventBus.on as jest.Mock).mock.calls[0][1];

      // Should not throw even with null message
      expect(() => registeredHandler(event)).not.toThrow();
    });
  });

  describe('lifecycle integration', () => {
    it('should maintain correct state through start-stop-start cycle', () => {
      // First start
      adapter.start();
      expect(adapter.isActive()).toBe(true);
      expect(eventBus.on).toHaveBeenCalledTimes(1);

      // Stop
      adapter.stop();
      expect(adapter.isActive()).toBe(false);
      expect(eventBus.off).toHaveBeenCalledTimes(1);

      jest.clearAllMocks();

      // Restart
      adapter.start();
      expect(adapter.isActive()).toBe(true);
      expect(eventBus.on).toHaveBeenCalledTimes(1);

      // Stop again
      adapter.stop();
      expect(adapter.isActive()).toBe(false);
      expect(eventBus.off).toHaveBeenCalledTimes(1);
    });

    it('should use same handler reference for subscribe and unsubscribe', () => {
      adapter.start();

      const subscribeCall = (eventBus.on as jest.Mock).mock.calls[0];
      const handler = subscribeCall[1];

      adapter.stop();

      const unsubscribeCall = (eventBus.off as jest.Mock).mock.calls[0];
      const unsubscribedHandler = unsubscribeCall[1];

      // Same handler should be used for both subscribe and unsubscribe
      expect(unsubscribedHandler).toBe(handler);
    });

    it('should handle rapid start/stop calls', () => {
      adapter.start();
      adapter.start(); // Should be ignored
      adapter.stop();
      adapter.stop(); // Should be ignored
      adapter.start();
      adapter.stop();

      // Only 2 starts and 2 stops should have had effect
      // (first start, restart after stop, and 2 stops)
      expect(eventBus.on).toHaveBeenCalledTimes(2);
      expect(eventBus.off).toHaveBeenCalledTimes(2);
    });
  });

  describe('getRfidUnifier()', () => {
    it('should return the RFIDUnifier instance', () => {
      const unifier = adapter.getRfidUnifier();

      expect(unifier).toBeDefined();
      expect(unifier).not.toBeNull();
    });

    it('should return same instance across multiple calls', () => {
      const unifier1 = adapter.getRfidUnifier();
      const unifier2 = adapter.getRfidUnifier();

      expect(unifier1).toBe(unifier2);
    });
  });
});
