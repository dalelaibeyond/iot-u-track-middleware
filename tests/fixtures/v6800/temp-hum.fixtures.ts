/**
 * V6800 TEMP_HUM Test Fixtures
 *
 * JSON message fixtures for V6800 temperature and humidity messages
 * Based on v6800_spec.md
 */

// ============================================================================
// V6800 TEMP_HUM Message Fixtures
// Topic: V6800Upload/{deviceId}/TemHum
// ============================================================================

/**
 * V6800 TEMP_HUM - Single module with temperature and humidity
 */
export const V6800_TEMP_HUM_SINGLE = {
  description: 'V6800 TEMP_HUM with single sensor',
  topic: 'V6800Upload/2437871205/TemHum',

  // Raw JSON as received from device
  rawJson: {
    msg_type: 'temper_humidity_exception_notify_req',
    gateway_sn: '2437871205',
    uuid_number: '550e8400-e29b-41d4-a716-446655440011',
    data: [
      {
        host_gateway_port_index: 1,
        extend_module_sn: '1234567890',
        th_data: [
          {
            temper_position: 10,
            temper_swot: 25.5,
            hygrometer_position: 10,
            hygrometer_swot: 65.2,
          },
        ],
      },
    ],
  },

  // Expected SIF output (after parsing)
  expectedSIF: {
    meta: {
      topic: 'V6800Upload/2437871205/TemHum',
      rawType: 'temper_humidity_exception_notify_req',
    },
    deviceId: '2437871205',
    deviceType: 'V6800',
    messageType: 'TEMP_HUM',
    messageId: '550e8400-e29b-41d4-a716-446655440011',
    data: [
      {
        moduleIndex: 1,
        moduleId: '1234567890',
        data: [
          {
            sensorIndex: 10,
            temp: 25.5,
            hum: 65.2,
          },
        ],
      },
    ],
  },

  // Expected SUO output (after normalization)
  expectedSUO: {
    suoType: 'SUO_TEMP_HUM',
    deviceId: '2437871205',
    deviceType: 'V6800',
    moduleIndex: 1,
    moduleId: '1234567890',
    serverTimestamp: '[SERVER_TIMESTAMP]',
    deviceTimestamp: null,
    messageId: '550e8400-e29b-41d4-a716-446655440011',
    data: {
      sensors: [
        {
          sensorIndex: 10,
          temp: 25.5,
          hum: 65.2,
        },
      ],
    },
  },
};

/**
 * V6800 TEMP_HUM - Multiple sensors
 */
export const V6800_TEMP_HUM_MULTIPLE = {
  description: 'V6800 TEMP_HUM with multiple sensors',
  topic: 'V6800Upload/2437871205/TemHum',

  rawJson: {
    msg_type: 'temper_humidity_exception_notify_req',
    gateway_sn: '2437871205',
    uuid_number: '550e8400-e29b-41d4-a716-446655440012',
    data: [
      {
        host_gateway_port_index: 1,
        extend_module_sn: '1234567890',
        th_data: [
          {
            temper_position: 10,
            temper_swot: 25.5,
            hygrometer_position: 10,
            hygrometer_swot: 65.2,
          },
          {
            temper_position: 11,
            temper_swot: 24.8,
            hygrometer_position: 11,
            hygrometer_swot: 63.5,
          },
        ],
      },
    ],
  },

  expectedSIF: {
    meta: {
      topic: 'V6800Upload/2437871205/TemHum',
      rawType: 'temper_humidity_exception_notify_req',
    },
    deviceId: '2437871205',
    deviceType: 'V6800',
    messageType: 'TEMP_HUM',
    messageId: '550e8400-e29b-41d4-a716-446655440012',
    data: [
      {
        moduleIndex: 1,
        moduleId: '1234567890',
        data: [
          {
            sensorIndex: 10,
            temp: 25.5,
            hum: 65.2,
          },
          {
            sensorIndex: 11,
            temp: 24.8,
            hum: 63.5,
          },
        ],
      },
    ],
  },

  expectedSUO: {
    suoType: 'SUO_TEMP_HUM',
    deviceId: '2437871205',
    deviceType: 'V6800',
    moduleIndex: 1,
    moduleId: '1234567890',
    serverTimestamp: '[SERVER_TIMESTAMP]',
    deviceTimestamp: null,
    messageId: '550e8400-e29b-41d4-a716-446655440012',
    data: {
      sensors: [
        {
          sensorIndex: 10,
          temp: 25.5,
          hum: 65.2,
        },
        {
          sensorIndex: 11,
          temp: 24.8,
          hum: 63.5,
        },
      ],
    },
  },
};

/**
 * V6800 TEMP_HUM - Typo in msg_type (nofity)
 */
export const V6800_TEMP_HUM_TYPO = {
  description: 'V6800 TEMP_HUM with typo in msg_type',
  topic: 'V6800Upload/2437871205/TemHum',

  rawJson: {
    msg_type: 'temper_humidity_exception_nofity_req',
    gateway_sn: '2437871205',
    uuid_number: '550e8400-e29b-41d4-a716-446655440013',
    data: [
      {
        host_gateway_port_index: 1,
        extend_module_sn: '1234567890',
        th_data: [
          {
            temper_position: 10,
            temper_swot: 25.5,
            hygrometer_position: 10,
            hygrometer_swot: 65.2,
          },
        ],
      },
    ],
  },

  expectedSIF: {
    meta: {
      topic: 'V6800Upload/2437871205/TemHum',
      rawType: 'temper_humidity_exception_nofity_req',
    },
    deviceId: '2437871205',
    deviceType: 'V6800',
    messageType: 'TEMP_HUM',
    messageId: '550e8400-e29b-41d4-a716-446655440013',
    data: [
      {
        moduleIndex: 1,
        moduleId: '1234567890',
        data: [
          {
            sensorIndex: 10,
            temp: 25.5,
            hum: 65.2,
          },
        ],
      },
    ],
  },

  expectedSUO: {
    suoType: 'SUO_TEMP_HUM',
    deviceId: '2437871205',
    deviceType: 'V6800',
    moduleIndex: 1,
    moduleId: '1234567890',
    serverTimestamp: '[SERVER_TIMESTAMP]',
    deviceTimestamp: null,
    messageId: '550e8400-e29b-41d4-a716-446655440013',
    data: {
      sensors: [
        {
          sensorIndex: 10,
          temp: 25.5,
          hum: 65.2,
        },
      ],
    },
  },
};

// Export all TEMP_HUM fixtures
export const V6800_TEMP_HUM_FIXTURES = [
  V6800_TEMP_HUM_SINGLE,
  V6800_TEMP_HUM_MULTIPLE,
  V6800_TEMP_HUM_TYPO,
];
