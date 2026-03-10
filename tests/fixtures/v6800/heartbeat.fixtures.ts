/**
 * V6800 HEARTBEAT Test Fixtures
 *
 * JSON message fixtures for V6800 heartbeat messages
 * Based on v6800_spec.md
 */

// ============================================================================
// V6800 HEARTBEAT Message Fixtures
// Topic: V6800Upload/{deviceId}/HeartBeat
// ============================================================================

/**
 * V6800 HEARTBEAT - Single module
 */
export const V6800_HEARTBEAT_SINGLE_MODULE = {
  description: 'V6800 HEARTBEAT with 1 module',
  topic: 'V6800Upload/2437871205/HeartBeat',

  // Raw JSON as received from device
  rawJson: {
    msg_type: 'heart_beat_req',
    module_type: 'RFID',
    module_sn: '2437871205',
    bus_V: '12.5',
    bus_I: '2.3',
    main_power: 1,
    backup_power: 0,
    uuid_number: '550e8400-e29b-41d4-a716-446655440004',
    data: [
      {
        module_index: 1,
        module_sn: '1234567890',
        module_m_num: 1001,
        module_u_num: 54,
      },
    ],
  },

  // Expected SIF output (after parsing)
  expectedSIF: {
    meta: {
      topic: 'V6800Upload/2437871205/HeartBeat',
      rawType: 'heart_beat_req',
      busVoltage: '12.5',
      busCurrent: '2.3',
      mainPower: 1,
      backupPower: 0,
    },
    deviceId: '2437871205',
    deviceType: 'V6800',
    messageType: 'HEARTBEAT',
    messageId: '550e8400-e29b-41d4-a716-446655440004',
    data: [
      {
        moduleIndex: 1,
        moduleId: '1234567890',
        uTotal: 54,
      },
    ],
  },

  // Expected SUO output (after normalization) - FLAT STRUCTURE
  expectedSUO: {
    suoType: 'SUO_HEARTBEAT',
    deviceId: '2437871205',
    deviceType: 'V6800',
    serverTimestamp: '[SERVER_TIMESTAMP]',
    deviceTimestamp: null,
    messageId: '550e8400-e29b-41d4-a716-446655440004',
    meta: {
      busVoltage: '12.5',
      busCurrent: '2.3',
      mainPower: 1,
      backupPower: 0,
    },
    modules: [
      {
        moduleIndex: 1,
        moduleId: '1234567890',
        uTotal: 54,
      },
    ],
  },
};

/**
 * V6800 HEARTBEAT - Multiple modules
 */
export const V6800_HEARTBEAT_MULTIPLE_MODULES = {
  description: 'V6800 HEARTBEAT with 2 modules',
  topic: 'V6800Upload/2437871205/HeartBeat',

  rawJson: {
    msg_type: 'heart_beat_req',
    module_type: 'RFID',
    module_sn: '2437871205',
    bus_V: '12.0',
    bus_I: '2.1',
    main_power: 1,
    backup_power: 1,
    uuid_number: '550e8400-e29b-41d4-a716-446655440005',
    data: [
      {
        module_index: 1,
        module_sn: '1234567890',
        module_m_num: 1001,
        module_u_num: 54,
      },
      {
        module_index: 2,
        module_sn: '1234567891',
        module_m_num: 1002,
        module_u_num: 54,
      },
    ],
  },

  expectedSIF: {
    meta: {
      topic: 'V6800Upload/2437871205/HeartBeat',
      rawType: 'heart_beat_req',
      busVoltage: '12.0',
      busCurrent: '2.1',
      mainPower: 1,
      backupPower: 1,
    },
    deviceId: '2437871205',
    deviceType: 'V6800',
    messageType: 'HEARTBEAT',
    messageId: '550e8400-e29b-41d4-a716-446655440005',
    data: [
      {
        moduleIndex: 1,
        moduleId: '1234567890',
        uTotal: 54,
      },
      {
        moduleIndex: 2,
        moduleId: '1234567891',
        uTotal: 54,
      },
    ],
  },

  // Expected SUO output (after normalization) - FLAT STRUCTURE
  expectedSUO: {
    suoType: 'SUO_HEARTBEAT',
    deviceId: '2437871205',
    deviceType: 'V6800',
    serverTimestamp: '[SERVER_TIMESTAMP]',
    deviceTimestamp: null,
    messageId: '550e8400-e29b-41d4-a716-446655440005',
    meta: {
      busVoltage: '12.0',
      busCurrent: '2.1',
      mainPower: 1,
      backupPower: 1,
    },
    modules: [
      {
        moduleIndex: 1,
        moduleId: '1234567890',
        uTotal: 54,
      },
      {
        moduleIndex: 2,
        moduleId: '1234567891',
        uTotal: 54,
      },
    ],
  },
};

// Export all HEARTBEAT fixtures
export const V6800_HEARTBEAT_FIXTURES = [
  V6800_HEARTBEAT_SINGLE_MODULE,
  V6800_HEARTBEAT_MULTIPLE_MODULES,
];
