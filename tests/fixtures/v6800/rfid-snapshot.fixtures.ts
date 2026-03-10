/**
 * V6800 RFID_SNAPSHOT Test Fixtures
 *
 * JSON message fixtures for V6800 RFID snapshot messages
 * Based on v6800_spec.md
 */

// ============================================================================
// V6800 RFID_SNAPSHOT Message Fixtures
// Topic: V6800Upload/{deviceId}/LabelState
// ============================================================================

/**
 * V6800 RFID_SNAPSHOT - Single module with tags
 */
export const V6800_RFID_SNAPSHOT_SINGLE = {
  description: 'V6800 RFID_SNAPSHOT with single module',
  topic: 'V6800Upload/2437871205/LabelState',

  // Raw JSON as received from device
  rawJson: {
    msg_type: 'u_state_resp',
    code: 200,
    gateway_sn: '2437871205',
    uuid_number: '550e8400-e29b-41d4-a716-446655440009',
    data: [
      {
        extend_module_sn: '1234567890',
        host_gateway_port_index: 1,
        u_data: [
          {
            u_index: 1,
            u_state: 1,
            tag_code: 'DD344A44',
            warning: 0,
          },
          {
            u_index: 2,
            u_state: 1,
            tag_code: 'DD344A45',
            warning: 1,
          },
          {
            u_index: 3,
            u_state: 0,
            tag_code: '',
            warning: 0,
          },
        ],
      },
    ],
  },

  // Expected SIF output (after parsing)
  expectedSIF: {
    meta: {
      topic: 'V6800Upload/2437871205/LabelState',
      rawType: 'u_state_resp',
    },
    deviceId: '2437871205',
    deviceType: 'V6800',
    messageType: 'RFID_SNAPSHOT',
    messageId: '550e8400-e29b-41d4-a716-446655440009',
    data: [
      {
        moduleIndex: 1,
        moduleId: '1234567890',
        data: [
          {
            sensorIndex: 1,
            tagId: 'DD344A44',
            isAlarm: false,
          },
          {
            sensorIndex: 2,
            tagId: 'DD344A45',
            isAlarm: true,
          },
          {
            sensorIndex: 3,
            tagId: '',
            isAlarm: false,
          },
        ],
      },
    ],
  },

  // Expected SUO output (after normalization)
  expectedSUO: {
    suoType: 'SUO_RFID_SNAPSHOT',
    deviceId: '2437871205',
    deviceType: 'V6800',
    moduleIndex: 1,
    moduleId: '1234567890',
    serverTimestamp: '[SERVER_TIMESTAMP]',
    deviceTimestamp: null,
    messageId: '550e8400-e29b-41d4-a716-446655440009',
    data: {
      sensors: [
        {
          sensorIndex: 1,
          tagId: 'DD344A44',
          isAlarm: false,
        },
        {
          sensorIndex: 2,
          tagId: 'DD344A45',
          isAlarm: true,
        },
        {
          sensorIndex: 3,
          tagId: '',
          isAlarm: false,
        },
      ],
    },
  },
};

/**
 * V6800 RFID_SNAPSHOT - Multiple modules
 */
export const V6800_RFID_SNAPSHOT_MULTIPLE = {
  description: 'V6800 RFID_SNAPSHOT with multiple modules',
  topic: 'V6800Upload/2437871205/LabelState',

  rawJson: {
    msg_type: 'u_state_resp',
    code: 200,
    gateway_sn: '2437871205',
    uuid_number: '550e8400-e29b-41d4-a716-446655440010',
    data: [
      {
        extend_module_sn: '1234567890',
        host_gateway_port_index: 1,
        u_data: [
          {
            u_index: 1,
            u_state: 1,
            tag_code: 'DD344A44',
            warning: 0,
          },
        ],
      },
      {
        extend_module_sn: '1234567891',
        host_gateway_port_index: 2,
        u_data: [
          {
            u_index: 1,
            u_state: 1,
            tag_code: 'DD344A46',
            warning: 0,
          },
        ],
      },
    ],
  },

  expectedSIF: {
    meta: {
      topic: 'V6800Upload/2437871205/LabelState',
      rawType: 'u_state_resp',
    },
    deviceId: '2437871205',
    deviceType: 'V6800',
    messageType: 'RFID_SNAPSHOT',
    messageId: '550e8400-e29b-41d4-a716-446655440010',
    data: [
      {
        moduleIndex: 1,
        moduleId: '1234567890',
        data: [
          {
            sensorIndex: 1,
            tagId: 'DD344A44',
            isAlarm: false,
          },
        ],
      },
      {
        moduleIndex: 2,
        moduleId: '1234567891',
        data: [
          {
            sensorIndex: 1,
            tagId: 'DD344A46',
            isAlarm: false,
          },
        ],
      },
    ],
  },

  expectedSUO: {
    suoType: 'SUO_RFID_SNAPSHOT',
    deviceId: '2437871205',
    deviceType: 'V6800',
    moduleIndex: 1,
    moduleId: '1234567890',
    serverTimestamp: '[SERVER_TIMESTAMP]',
    deviceTimestamp: null,
    messageId: '550e8400-e29b-41d4-a716-446655440010',
    data: {
      sensors: [
        {
          sensorIndex: 1,
          tagId: 'DD344A44',
          isAlarm: false,
        },
      ],
    },
  },
};

// Export all RFID_SNAPSHOT fixtures
export const V6800_RFID_SNAPSHOT_FIXTURES = [
  V6800_RFID_SNAPSHOT_SINGLE,
  V6800_RFID_SNAPSHOT_MULTIPLE,
];
