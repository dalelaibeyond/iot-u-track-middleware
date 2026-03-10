/**
 * V6800 Command Response Test Fixtures
 *
 * JSON message fixtures for V6800 command response messages
 * Based on v6800_spec.md
 */

// ============================================================================
// V6800 SET_COLOR_RESP Message Fixtures
// Topic: V6800Upload/{deviceId}/OpeAck
// ============================================================================

/**
 * V6800 SET_COLOR_RESP - Success
 */
export const V6800_SET_COLOR_RESP_SUCCESS = {
  description: 'V6800 SET_COLOR_RESP success',
  topic: 'V6800Upload/2437871205/OpeAck',

  rawJson: {
    msg_type: 'set_module_property_result_req',
    set_property_type: 8001,
    gateway_sn: '2437871205',
    uuid_number: '550e8400-e29b-41d4-a716-446655440018',
    data: [
      {
        host_gateway_port_index: 1,
        extend_module_sn: '1234567890',
        module_type: 'RFID',
        set_property_result: 0,
      },
    ],
  },

  expectedSIF: {
    meta: {
      topic: 'V6800Upload/2437871205/OpeAck',
      rawType: 'set_module_property_result_req',
    },
    deviceId: '2437871205',
    deviceType: 'V6800',
    messageType: 'SET_COLOR_RESP',
    messageId: '550e8400-e29b-41d4-a716-446655440018',
    data: [
      {
        moduleIndex: 1,
        moduleId: '1234567890',
        result: 'Success',
      },
    ],
  },

  expectedSUO: {
    suoType: 'SUO_COMMAND_RESULT',
    deviceId: '2437871205',
    deviceType: 'V6800',
    moduleIndex: 1,
    moduleId: '1234567890',
    serverTimestamp: '[SERVER_TIMESTAMP]',
    deviceTimestamp: null,
    messageId: '550e8400-e29b-41d4-a716-446655440018',
    data: {
      commandType: 'SET_COLOR',
      result: 'Success',
      originalReq: null,
      colorCodes: null,
    },
  },
};

/**
 * V6800 SET_COLOR_RESP - Failure
 */
export const V6800_SET_COLOR_RESP_FAILURE = {
  description: 'V6800 SET_COLOR_RESP failure',
  topic: 'V6800Upload/2437871205/OpeAck',

  rawJson: {
    msg_type: 'set_module_property_result_req',
    set_property_type: 8001,
    gateway_sn: '2437871205',
    uuid_number: '550e8400-e29b-41d4-a716-446655440019',
    data: [
      {
        host_gateway_port_index: 1,
        extend_module_sn: '1234567890',
        module_type: 'RFID',
        set_property_result: 1,
      },
    ],
  },

  expectedSIF: {
    meta: {
      topic: 'V6800Upload/2437871205/OpeAck',
      rawType: 'set_module_property_result_req',
    },
    deviceId: '2437871205',
    deviceType: 'V6800',
    messageType: 'SET_COLOR_RESP',
    messageId: '550e8400-e29b-41d4-a716-446655440019',
    data: [
      {
        moduleIndex: 1,
        moduleId: '1234567890',
        result: 'Failure',
      },
    ],
  },

  expectedSUO: {
    suoType: 'SUO_COMMAND_RESULT',
    deviceId: '2437871205',
    deviceType: 'V6800',
    moduleIndex: 1,
    moduleId: '1234567890',
    serverTimestamp: '[SERVER_TIMESTAMP]',
    deviceTimestamp: null,
    messageId: '550e8400-e29b-41d4-a716-446655440019',
    data: {
      commandType: 'SET_COLOR',
      result: 'Failure',
      originalReq: null,
      colorCodes: null,
    },
  },
};

// ============================================================================
// V6800 QUERY_COLOR_RESP Message Fixtures
// Topic: V6800Upload/{deviceId}/OpeAck
// ============================================================================

/**
 * V6800 QUERY_COLOR_RESP
 */
export const V6800_QUERY_COLOR_RESP = {
  description: 'V6800 QUERY_COLOR_RESP',
  topic: 'V6800Upload/2437871205/OpeAck',

  rawJson: {
    msg_type: 'u_color',
    gateway_id: '2437871205',
    count: 1,
    code: 200,
    uuid_number: '550e8400-e29b-41d4-a716-446655440020',
    data: [
      {
        index: 1,
        module_id: '1234567890',
        u_num: 54,
        color_data: [
          { index: 1, color: 'RED', code: 1 },
          { index: 2, color: 'GREEN', code: 2 },
          { index: 3, color: 'OFF', code: 0 },
        ],
      },
    ],
  },

  expectedSIF: {
    meta: {
      topic: 'V6800Upload/2437871205/OpeAck',
      rawType: 'u_color',
    },
    deviceId: '2437871205',
    deviceType: 'V6800',
    messageType: 'QUERY_COLOR_RESP',
    messageId: '550e8400-e29b-41d4-a716-446655440020',
    data: [
      {
        moduleIndex: 1,
        moduleId: '1234567890',
        uTotal: 54,
        data: [
          { sensorIndex: 1, colorName: 'RED', colorCode: 1 },
          { sensorIndex: 2, colorName: 'GREEN', colorCode: 2 },
          { sensorIndex: 3, colorName: 'OFF', colorCode: 0 },
        ],
      },
    ],
  },

  expectedSUO: {
    suoType: 'SUO_COMMAND_RESULT',
    deviceId: '2437871205',
    deviceType: 'V6800',
    moduleIndex: 1,
    moduleId: '1234567890',
    serverTimestamp: '[SERVER_TIMESTAMP]',
    deviceTimestamp: null,
    messageId: '550e8400-e29b-41d4-a716-446655440020',
    data: {
      commandType: 'QUERY_COLOR',
      result: 'Success',
      originalReq: null,
      colorCodes: [1, 2, 0],
    },
  },
};

// ============================================================================
// V6800 CLEAR_ALARM_RESP Message Fixtures
// Topic: V6800Upload/{deviceId}/OpeAck
// ============================================================================

/**
 * V6800 CLEAR_ALARM_RESP - Success
 */
export const V6800_CLEAR_ALARM_RESP_SUCCESS = {
  description: 'V6800 CLEAR_ALARM_RESP success',
  topic: 'V6800Upload/2437871205/OpeAck',

  rawJson: {
    msg_type: 'clear_u_warning',
    gateway_id: '2437871205',
    count: 1,
    code: 200,
    uuid_number: '550e8400-e29b-41d4-a716-446655440021',
    data: [
      {
        index: 1,
        module_id: '1234567890',
        u_num: 54,
        ctr_flag: true,
      },
    ],
  },

  expectedSIF: {
    meta: {
      topic: 'V6800Upload/2437871205/OpeAck',
      rawType: 'clear_u_warning',
    },
    deviceId: '2437871205',
    deviceType: 'V6800',
    messageType: 'CLEAR_ALARM_RESP',
    messageId: '550e8400-e29b-41d4-a716-446655440021',
    data: [
      {
        moduleIndex: 1,
        moduleId: '1234567890',
        uTotal: 54,
        result: 'Success',
      },
    ],
  },

  expectedSUO: {
    suoType: 'SUO_COMMAND_RESULT',
    deviceId: '2437871205',
    deviceType: 'V6800',
    moduleIndex: 1,
    moduleId: '1234567890',
    serverTimestamp: '[SERVER_TIMESTAMP]',
    deviceTimestamp: null,
    messageId: '550e8400-e29b-41d4-a716-446655440021',
    data: {
      commandType: 'CLEAR_ALARM',
      result: 'Success',
      originalReq: null,
      colorCodes: null,
    },
  },
};

/**
 * V6800 CLEAR_ALARM_RESP - Failure
 */
export const V6800_CLEAR_ALARM_RESP_FAILURE = {
  description: 'V6800 CLEAR_ALARM_RESP failure',
  topic: 'V6800Upload/2437871205/OpeAck',

  rawJson: {
    msg_type: 'clear_u_warning',
    gateway_id: '2437871205',
    count: 1,
    code: 200,
    uuid_number: '550e8400-e29b-41d4-a716-446655440022',
    data: [
      {
        index: 1,
        module_id: '1234567890',
        u_num: 54,
        ctr_flag: false,
      },
    ],
  },

  expectedSIF: {
    meta: {
      topic: 'V6800Upload/2437871205/OpeAck',
      rawType: 'clear_u_warning',
    },
    deviceId: '2437871205',
    deviceType: 'V6800',
    messageType: 'CLEAR_ALARM_RESP',
    messageId: '550e8400-e29b-41d4-a716-446655440022',
    data: [
      {
        moduleIndex: 1,
        moduleId: '1234567890',
        uTotal: 54,
        result: 'Failure',
      },
    ],
  },

  expectedSUO: {
    suoType: 'SUO_COMMAND_RESULT',
    deviceId: '2437871205',
    deviceType: 'V6800',
    moduleIndex: 1,
    moduleId: '1234567890',
    serverTimestamp: '[SERVER_TIMESTAMP]',
    deviceTimestamp: null,
    messageId: '550e8400-e29b-41d4-a716-446655440022',
    data: {
      commandType: 'CLEAR_ALARM',
      result: 'Failure',
      originalReq: null,
      colorCodes: null,
    },
  },
};

// Export all command response fixtures
export const V6800_COMMAND_RESP_FIXTURES = [
  V6800_SET_COLOR_RESP_SUCCESS,
  V6800_SET_COLOR_RESP_FAILURE,
  V6800_QUERY_COLOR_RESP,
  V6800_CLEAR_ALARM_RESP_SUCCESS,
  V6800_CLEAR_ALARM_RESP_FAILURE,
];
