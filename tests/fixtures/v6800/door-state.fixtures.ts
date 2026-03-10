/**
 * V6800 DOOR_STATE Test Fixtures
 *
 * JSON message fixtures for V6800 door state messages
 * Based on v6800_spec.md
 */

// ============================================================================
// V6800 DOOR_STATE_EVENT Message Fixtures
// Topic: V6800Upload/{deviceId}/Door
// ============================================================================

/**
 * V6800 DOOR_STATE_EVENT - Single door
 */
export const V6800_DOOR_STATE_EVENT_SINGLE = {
  description: 'V6800 DOOR_STATE_EVENT with single door',
  topic: 'V6800Upload/2437871205/Door',

  // Raw JSON as received from device
  rawJson: {
    msg_type: 'door_state_changed_notify_req',
    gateway_sn: '2437871205',
    uuid_number: '550e8400-e29b-41d4-a716-446655440014',
    data: [
      {
        extend_module_sn: '1234567890',
        host_gateway_port_index: 1,
        new_state: 1,
      },
    ],
  },

  // Expected SIF output (after parsing)
  expectedSIF: {
    meta: {
      topic: 'V6800Upload/2437871205/Door',
      rawType: 'door_state_changed_notify_req',
    },
    deviceId: '2437871205',
    deviceType: 'V6800',
    messageType: 'DOOR_STATE_EVENT',
    messageId: '550e8400-e29b-41d4-a716-446655440014',
    data: [
      {
        moduleId: '1234567890',
        moduleIndex: 1,
        door1State: 1,
        door2State: null,
      },
    ],
  },

  // Expected SUO output (after normalization)
  expectedSUO: {
    suoType: 'SUO_DOOR_STATE',
    deviceId: '2437871205',
    deviceType: 'V6800',
    moduleIndex: 1,
    moduleId: '1234567890',
    serverTimestamp: '[SERVER_TIMESTAMP]',
    deviceTimestamp: null,
    messageId: '550e8400-e29b-41d4-a716-446655440014',
    door1State: 1,
    door2State: null,
  },
};

/**
 * V6800 DOOR_STATE_EVENT - Dual door
 */
export const V6800_DOOR_STATE_EVENT_DUAL = {
  description: 'V6800 DOOR_STATE_EVENT with dual doors',
  topic: 'V6800Upload/2437871205/Door',

  rawJson: {
    msg_type: 'door_state_changed_notify_req',
    gateway_sn: '2437871205',
    uuid_number: '550e8400-e29b-41d4-a716-446655440015',
    data: [
      {
        extend_module_sn: '1234567890',
        host_gateway_port_index: 1,
        new_state1: 1,
        new_state2: 0,
      },
    ],
  },

  expectedSIF: {
    meta: {
      topic: 'V6800Upload/2437871205/Door',
      rawType: 'door_state_changed_notify_req',
    },
    deviceId: '2437871205',
    deviceType: 'V6800',
    messageType: 'DOOR_STATE_EVENT',
    messageId: '550e8400-e29b-41d4-a716-446655440015',
    data: [
      {
        moduleId: '1234567890',
        moduleIndex: 1,
        door1State: 1,
        door2State: 0,
      },
    ],
  },

  expectedSUO: {
    suoType: 'SUO_DOOR_STATE',
    deviceId: '2437871205',
    deviceType: 'V6800',
    moduleIndex: 1,
    moduleId: '1234567890',
    serverTimestamp: '[SERVER_TIMESTAMP]',
    deviceTimestamp: null,
    messageId: '550e8400-e29b-41d4-a716-446655440015',
    door1State: 1,
    door2State: 0,
  },
};

// ============================================================================
// V6800 QUERY_DOOR_STATE_RESP Message Fixtures
// Topic: V6800Upload/{deviceId}/Door
// ============================================================================

/**
 * V6800 QUERY_DOOR_STATE_RESP - Single door
 */
export const V6800_QUERY_DOOR_STATE_RESP_SINGLE = {
  description: 'V6800 QUERY_DOOR_STATE_RESP with single door',
  topic: 'V6800Upload/2437871205/Door',

  rawJson: {
    msg_type: 'door_state_resp',
    code: 200,
    gateway_port_index: 1,
    new_state: 0,
    uuid_number: '550e8400-e29b-41d4-a716-446655440016',
  },

  expectedSIF: {
    meta: {
      topic: 'V6800Upload/2437871205/Door',
      rawType: 'door_state_resp',
    },
    deviceId: '2437871205',
    deviceType: 'V6800',
    messageType: 'QUERY_DOOR_STATE_RESP',
    messageId: '550e8400-e29b-41d4-a716-446655440016',
    data: [
      {
        moduleIndex: 1,
        door1State: 0,
        door2State: null,
      },
    ],
  },

  expectedSUO: {
    suoType: 'SUO_DOOR_STATE',
    deviceId: '2437871205',
    deviceType: 'V6800',
    moduleIndex: 1,
    moduleId: null,
    serverTimestamp: '[SERVER_TIMESTAMP]',
    deviceTimestamp: null,
    messageId: '550e8400-e29b-41d4-a716-446655440016',
    door1State: 0,
    door2State: null,
  },
};

/**
 * V6800 QUERY_DOOR_STATE_RESP - Dual door
 */
export const V6800_QUERY_DOOR_STATE_RESP_DUAL = {
  description: 'V6800 QUERY_DOOR_STATE_RESP with dual doors',
  topic: 'V6800Upload/2437871205/Door',

  rawJson: {
    msg_type: 'door_state_resp',
    code: 200,
    gateway_port_index: 2,
    new_state1: 0,
    new_state2: 1,
    uuid_number: '550e8400-e29b-41d4-a716-446655440017',
  },

  expectedSIF: {
    meta: {
      topic: 'V6800Upload/2437871205/Door',
      rawType: 'door_state_resp',
    },
    deviceId: '2437871205',
    deviceType: 'V6800',
    messageType: 'QUERY_DOOR_STATE_RESP',
    messageId: '550e8400-e29b-41d4-a716-446655440017',
    data: [
      {
        moduleIndex: 2,
        door1State: 0,
        door2State: 1,
      },
    ],
  },

  expectedSUO: {
    suoType: 'SUO_DOOR_STATE',
    deviceId: '2437871205',
    deviceType: 'V6800',
    moduleIndex: 2,
    moduleId: null,
    serverTimestamp: '[SERVER_TIMESTAMP]',
    deviceTimestamp: null,
    messageId: '550e8400-e29b-41d4-a716-446655440017',
    door1State: 0,
    door2State: 1,
  },
};

// Export all door state fixtures
export const V6800_DOOR_STATE_FIXTURES = [
  V6800_DOOR_STATE_EVENT_SINGLE,
  V6800_DOOR_STATE_EVENT_DUAL,
  V6800_QUERY_DOOR_STATE_RESP_SINGLE,
  V6800_QUERY_DOOR_STATE_RESP_DUAL,
];
