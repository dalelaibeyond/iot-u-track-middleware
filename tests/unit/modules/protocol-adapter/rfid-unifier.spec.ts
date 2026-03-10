/**
 * RFID Unifier Tests
 *
 * Comprehensive tests for RFID event unification between V5008 and V6800 devices.
 */

import { RFIDUnifier, RFIDUnifierConfig } from '@modules/protocol-adapter/rfid-unifier';
import { UOSCache } from '@modules/cache';
import { SUORfidSnapshot, SUORfidEvent } from '@t/suo.types';
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

describe('RFIDUnifier', () => {
  let unifier: RFIDUnifier;
  let cache: UOSCache;
  let config: RFIDUnifierConfig;

  beforeEach(() => {
    cache = new UOSCache({ maxSize: 100 });
    config = {
      dedupWindowMs: 5000, // 5 seconds for testing
    };
    unifier = new RFIDUnifier(config, cache);
    jest.clearAllMocks();
  });

  afterEach(() => {
    cache.dispose();
    unifier.clearDedupWindow();
  });

  describe('processV5008Snapshot', () => {
    it('should emit ATTACHED event for new tags on first snapshot', () => {
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
          sensors: [
            { sensorIndex: 0, tagId: 'TAG-001', isAlarm: false },
            { sensorIndex: 1, tagId: 'TAG-002', isAlarm: true },
          ],
        },
      };

      unifier.processV5008Snapshot(snapshot);

      // Should emit 2 events (one for each tag)
      expect(eventBus.emit).toHaveBeenCalledTimes(2);
      expect(eventBus.emit).toHaveBeenCalledWith(
        SystemEvents.SUO_MQTT_MESSAGE,
        expect.objectContaining({
          message: expect.objectContaining({
            suoType: 'SUO_RFID_EVENT',
            deviceId: 'test-device',
            deviceType: 'V5008',
            moduleIndex: 1,
            moduleId: 'MOD-001',
            data: expect.objectContaining({
              sensorIndex: 0,
              tagId: 'TAG-001',
              action: 'ATTACHED',
              isAlarm: false,
            }),
          }),
        })
      );
    });

    it('should emit DETACHED event when tag is removed', () => {
      // First snapshot with tags
      const snapshot1: SUORfidSnapshot = {
        suoType: 'SUO_RFID_SNAPSHOT',
        deviceId: 'test-device',
        deviceType: 'V5008',
        moduleIndex: 1,
        moduleId: 'MOD-001',
        serverTimestamp: new Date().toISOString(),
        deviceTimestamp: null,
        messageId: 'msg-1',
        data: {
          sensors: [
            { sensorIndex: 0, tagId: 'TAG-001', isAlarm: false },
            { sensorIndex: 1, tagId: 'TAG-002', isAlarm: true },
          ],
        },
      };

      // Second snapshot with one tag removed
      const snapshot2: SUORfidSnapshot = {
        suoType: 'SUO_RFID_SNAPSHOT',
        deviceId: 'test-device',
        deviceType: 'V5008',
        moduleIndex: 1,
        moduleId: 'MOD-001',
        serverTimestamp: new Date().toISOString(),
        deviceTimestamp: null,
        messageId: 'msg-2',
        data: {
          sensors: [
            { sensorIndex: 0, tagId: 'TAG-001', isAlarm: false },
            { sensorIndex: 1, tagId: null, isAlarm: false },
          ],
        },
      };

      unifier.processV5008Snapshot(snapshot1);
      jest.clearAllMocks();
      unifier.processV5008Snapshot(snapshot2);

      // Should emit 1 DETACHED event for TAG-002
      expect(eventBus.emit).toHaveBeenCalledTimes(1);
      expect(eventBus.emit).toHaveBeenCalledWith(
        SystemEvents.SUO_MQTT_MESSAGE,
        expect.objectContaining({
          message: expect.objectContaining({
            suoType: 'SUO_RFID_EVENT',
            data: expect.objectContaining({
              sensorIndex: 1,
              tagId: 'TAG-002',
              action: 'DETACHED',
              isAlarm: true,
            }),
          }),
        })
      );
    });

    it('should emit ATTACHED event when new tag is added', () => {
      // First snapshot with one tag
      const snapshot1: SUORfidSnapshot = {
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

      // Second snapshot with new tag added
      const snapshot2: SUORfidSnapshot = {
        suoType: 'SUO_RFID_SNAPSHOT',
        deviceId: 'test-device',
        deviceType: 'V5008',
        moduleIndex: 1,
        moduleId: 'MOD-001',
        serverTimestamp: new Date().toISOString(),
        deviceTimestamp: null,
        messageId: 'msg-2',
        data: {
          sensors: [
            { sensorIndex: 0, tagId: 'TAG-001', isAlarm: false },
            { sensorIndex: 1, tagId: 'TAG-002', isAlarm: false },
          ],
        },
      };

      unifier.processV5008Snapshot(snapshot1);
      jest.clearAllMocks();
      unifier.processV5008Snapshot(snapshot2);

      // Should emit 1 ATTACHED event for TAG-002
      expect(eventBus.emit).toHaveBeenCalledTimes(1);
      expect(eventBus.emit).toHaveBeenCalledWith(
        SystemEvents.SUO_MQTT_MESSAGE,
        expect.objectContaining({
          message: expect.objectContaining({
            suoType: 'SUO_RFID_EVENT',
            data: expect.objectContaining({
              sensorIndex: 1,
              tagId: 'TAG-002',
              action: 'ATTACHED',
              isAlarm: false,
            }),
          }),
        })
      );
    });

    it('should emit both DETACHED and ATTACHED when tag is swapped', () => {
      // First snapshot with initial tag
      const snapshot1: SUORfidSnapshot = {
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

      // Second snapshot with swapped tag
      const snapshot2: SUORfidSnapshot = {
        suoType: 'SUO_RFID_SNAPSHOT',
        deviceId: 'test-device',
        deviceType: 'V5008',
        moduleIndex: 1,
        moduleId: 'MOD-001',
        serverTimestamp: new Date().toISOString(),
        deviceTimestamp: null,
        messageId: 'msg-2',
        data: {
          sensors: [{ sensorIndex: 0, tagId: 'TAG-002', isAlarm: true }],
        },
      };

      unifier.processV5008Snapshot(snapshot1);
      jest.clearAllMocks();
      unifier.processV5008Snapshot(snapshot2);

      // Should emit 2 events (DETACHED TAG-001, ATTACHED TAG-002)
      expect(eventBus.emit).toHaveBeenCalledTimes(2);

      const calls = (eventBus.emit as jest.Mock).mock.calls;
      const detachedCall = calls.find(call => call[1].message.data.action === 'DETACHED');
      const attachedCall = calls.find(call => call[1].message.data.action === 'ATTACHED');

      expect(detachedCall).toBeTruthy();
      expect(detachedCall[1].message.data.tagId).toBe('TAG-001');
      expect(attachedCall).toBeTruthy();
      expect(attachedCall[1].message.data.tagId).toBe('TAG-002');
    });

    it('should not emit events for empty slots', () => {
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
          sensors: [
            { sensorIndex: 0, tagId: null, isAlarm: false },
            { sensorIndex: 1, tagId: null, isAlarm: false },
          ],
        },
      };

      unifier.processV5008Snapshot(snapshot);

      // Should not emit any events for empty slots
      expect(eventBus.emit).not.toHaveBeenCalled();
    });
  });

  describe('processV6800Event', () => {
    it('should trigger snapshot query when V6800 RFID_EVENT is received', () => {
      const event: SUORfidEvent = {
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

      unifier.processV6800Event(event);

      // Should emit command to query snapshot
      expect(eventBus.emit).toHaveBeenCalledTimes(1);
      expect(eventBus.emit).toHaveBeenCalledWith(
        SystemEvents.COMMAND_PUBLISH,
        expect.objectContaining({
          topic: 'V6800Download/test-device',
          payload: expect.any(Buffer),
        })
      );

      // Verify the payload contains the correct command
      const call = (eventBus.emit as jest.Mock).mock.calls[0];
      const payload = JSON.parse(call[1].payload.toString());
      expect(payload.msg_type).toBe('u_state_req');
      expect(payload.gateway_port_index).toBe(1);
    });
  });

  describe('processV6800Snapshot', () => {
    it('should process snapshot and emit events same as V5008', () => {
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
          sensors: [
            { sensorIndex: 0, tagId: 'TAG-001', isAlarm: false },
            { sensorIndex: 1, tagId: 'TAG-002', isAlarm: true },
          ],
        },
      };

      unifier.processV6800Snapshot(snapshot);

      // Should emit 2 ATTACHED events
      expect(eventBus.emit).toHaveBeenCalledTimes(2);
      expect(eventBus.emit).toHaveBeenCalledWith(
        SystemEvents.SUO_MQTT_MESSAGE,
        expect.objectContaining({
          message: expect.objectContaining({
            suoType: 'SUO_RFID_EVENT',
            deviceType: 'V6800',
            data: expect.objectContaining({
              action: 'ATTACHED',
            }),
          }),
        })
      );
    });
  });

  describe('deduplication', () => {
    it('should deduplicate events within the deduplication window', () => {
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

      // Process same snapshot twice
      unifier.processV5008Snapshot(snapshot);
      jest.clearAllMocks();
      unifier.processV5008Snapshot(snapshot);

      // Should not emit events due to deduplication
      expect(eventBus.emit).not.toHaveBeenCalled();
    });

    it('should allow events after deduplication window expires', async () => {
      // Use a very short dedup window
      const shortConfig: RFIDUnifierConfig = { dedupWindowMs: 10 };
      const shortUnifier = new RFIDUnifier(shortConfig, cache);

      // First snapshot - empty
      const snapshot1: SUORfidSnapshot = {
        suoType: 'SUO_RFID_SNAPSHOT',
        deviceId: 'test-device',
        deviceType: 'V5008',
        moduleIndex: 1,
        moduleId: 'MOD-001',
        serverTimestamp: new Date().toISOString(),
        deviceTimestamp: null,
        messageId: 'msg-1',
        data: {
          sensors: [{ sensorIndex: 0, tagId: null, isAlarm: false }],
        },
      };

      // Second snapshot - tag attached
      const snapshot2: SUORfidSnapshot = {
        suoType: 'SUO_RFID_SNAPSHOT',
        deviceId: 'test-device',
        deviceType: 'V5008',
        moduleIndex: 1,
        moduleId: 'MOD-001',
        serverTimestamp: new Date().toISOString(),
        deviceTimestamp: null,
        messageId: 'msg-2',
        data: {
          sensors: [{ sensorIndex: 0, tagId: 'TAG-001', isAlarm: false }],
        },
      };

      // Process initial empty state
      shortUnifier.processV5008Snapshot(snapshot1);
      jest.clearAllMocks();

      // Process tag attachment - should emit ATTACHED event
      shortUnifier.processV5008Snapshot(snapshot2);
      expect(eventBus.emit).toHaveBeenCalledTimes(1);
      jest.clearAllMocks();

      // Detach and re-attach the same tag quickly (within dedup window)
      const snapshot3: SUORfidSnapshot = {
        ...snapshot1,
        messageId: 'msg-3',
        serverTimestamp: new Date().toISOString(),
      };
      const snapshot4: SUORfidSnapshot = {
        ...snapshot2,
        messageId: 'msg-4',
        serverTimestamp: new Date().toISOString(),
      };

      shortUnifier.processV5008Snapshot(snapshot3);
      // DETACHED should be emitted
      expect(eventBus.emit).toHaveBeenCalledTimes(1);
      jest.clearAllMocks();

      // Immediately re-attach - should be deduplicated
      shortUnifier.processV5008Snapshot(snapshot4);
      // ATTACHED should be deduplicated because we just emitted it
      expect(eventBus.emit).toHaveBeenCalledTimes(0);

      // Wait for dedup window to expire
      await new Promise(resolve => setTimeout(resolve, 20));

      // Clear dedup window and trigger change again
      shortUnifier.clearDedupWindow();
      const snapshot5: SUORfidSnapshot = {
        ...snapshot3,
        messageId: 'msg-5',
        serverTimestamp: new Date().toISOString(),
      };
      shortUnifier.processV5008Snapshot(snapshot5);

      // Should emit DETACHED event now
      expect(eventBus.emit).toHaveBeenCalledTimes(1);

      cache.dispose();
    });
  });

  describe('cache integration', () => {
    it('should store RFID state in UOS cache', () => {
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
          sensors: [
            { sensorIndex: 0, tagId: 'TAG-001', isAlarm: false },
            { sensorIndex: 1, tagId: 'TAG-002', isAlarm: true },
          ],
        },
      };

      unifier.processV5008Snapshot(snapshot);

      // Verify cache was updated
      const moduleState = cache.getModule('test-device', 1);
      expect(moduleState).not.toBeNull();
      expect(moduleState?.rfidSnapshot).toHaveLength(2);
      expect(moduleState?.rfidSnapshot[0].tagId).toBe('TAG-001');
      expect(moduleState?.rfidSnapshot[1].tagId).toBe('TAG-002');
      expect(moduleState?.lastSeenRfid).toBeDefined();
    });

    it('should preserve other telemetry data in cache', () => {
      // Pre-populate cache with some telemetry
      cache.setModule('test-device', 1, {
        deviceId: 'test-device',
        deviceType: 'V5008',
        moduleIndex: 1,
        moduleId: 'MOD-001',
        isOnline: true,
        lastSeenHb: '2024-01-01T00:00:00Z',
        uTotal: 4,
        tempHum: [{ sensorIndex: 0, temp: 25, hum: 60 }],
        lastSeenTh: '2024-01-01T00:00:00Z',
        noiseLevel: [],
        lastSeenNs: null,
        rfidSnapshot: [],
        lastSeenRfid: null,
        door1State: 0,
        door2State: null,
        lastSeenDoor: '2024-01-01T00:00:00Z',
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

      unifier.processV5008Snapshot(snapshot);

      // Verify other telemetry was preserved
      const moduleState = cache.getModule('test-device', 1);
      expect(moduleState?.lastSeenHb).toBe('2024-01-01T00:00:00Z');
      expect(moduleState?.tempHum).toHaveLength(1);
      expect(moduleState?.door1State).toBe(0);
    });
  });

  describe('multiple modules', () => {
    it('should handle different modules independently', () => {
      const snapshot1: SUORfidSnapshot = {
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

      const snapshot2: SUORfidSnapshot = {
        suoType: 'SUO_RFID_SNAPSHOT',
        deviceId: 'test-device',
        deviceType: 'V5008',
        moduleIndex: 2,
        moduleId: 'MOD-002',
        serverTimestamp: new Date().toISOString(),
        deviceTimestamp: null,
        messageId: 'msg-2',
        data: {
          sensors: [{ sensorIndex: 0, tagId: 'TAG-002', isAlarm: true }],
        },
      };

      unifier.processV5008Snapshot(snapshot1);
      unifier.processV5008Snapshot(snapshot2);

      // Should emit 1 event for each module
      expect(eventBus.emit).toHaveBeenCalledTimes(2);

      // Verify both modules are cached separately
      const module1 = cache.getModule('test-device', 1);
      const module2 = cache.getModule('test-device', 2);

      expect(module1?.rfidSnapshot[0].tagId).toBe('TAG-001');
      expect(module2?.rfidSnapshot[0].tagId).toBe('TAG-002');
    });
  });

  describe('utility methods', () => {
    it('should clear deduplication window', () => {
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

      unifier.processV5008Snapshot(snapshot);
      expect(unifier.getDedupWindowSize()).toBeGreaterThan(0);

      unifier.clearDedupWindow();
      expect(unifier.getDedupWindowSize()).toBe(0);
    });
  });
});
