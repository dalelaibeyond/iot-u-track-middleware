/**
 * V6800 RFID_EVENT Test Fixtures
 *
 * JSON message fixtures for V6800 RFID events
 * Based on v6800_spec.md
 */

// ============================================================================
// V6800 RFID_EVENT Message Fixtures
// Topic: V6800Upload/{deviceId}/LabelState
// ============================================================================

/**
 * V6800 RFID_EVENT - Tag attached
 */
export const V6800_RFID_EVENT_ATTACHED = {
  description: 'V6800 RFID_EVENT with tag attached',
  topic: 'V6800Upload/2437871205/LabelState',

  // Raw JSON as received from device
  rawJson: {
    msg_type: 'u_state_changed_notify_req',
    gateway_sn: '2437871205',
    uuid_number: '550e8400-e29b-41d4-a716-446655440006',
    data: [
      {
        host_gateway_port_index: 1,
        extend_module_sn: '1234567890',
        u_data: [
          {
            u_index: 5,
            new_state: 1,
            old_state: 0,
            tag_code: 'DD344A44',
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
      rawType: 'u_state_changed_notify_req',
    },
    deviceId: '2437871205',
    deviceType: 'V6800',
    messageType: 'RFID_EVENT',
    messageId: '550e8400-e29b-41d4-a716-446655440006',
    data: [
      {
        moduleIndex: 1,
        moduleId: '1234567890',
        data: [
          {
            sensorIndex: 5,
            action: 'ATTACHED',
            tagId: 'DD344A44',
            isAlarm: false,
          },
        ],
      },
    ],
  },

  // Expected SUO output (after normalization)
  expectedSUO: {
    suoType: 'SUO_RFID_EVENT',
    deviceId: '2437871205',
    deviceType: 'V6800',
    moduleIndex: 1,
    moduleId: '1234567890',
    serverTimestamp: '[SERVER_TIMESTAMP]',
    deviceTimestamp: null,
    messageId: '550e8400-e29b-41d4-a716-446655440006',
    data: {
      events: [
        {
          sensorIndex: 5,
          action: 'ATTACHED',
          tagId: 'DD344A44',
          isAlarm: false,
        },
      ],
    },
  },
};

/**
 * V6800 RFID_EVENT - Tag detached
 */
export const V6800_RFID_EVENT_DETACHED = {
  description: 'V6800 RFID_EVENT with tag detached',
  topic: 'V6800Upload/2437871205/LabelState',

  rawJson: {
    msg_type: 'u_state_changed_notify_req',
    gateway_sn: '2437871205',
    uuid_number: '550e8400-e29b-41d4-a716-446655440007',
    data: [
      {
        host_gateway_port_index: 2,
        extend_module_sn: '1234567891',
        u_data: [
          {
            u_index: 10,
            new_state: 0,
            old_state: 1,
            tag_code: 'DD344A45',
            warning: 0,
          },
        ],
      },
    ],
  },

  expectedSIF: {
    meta: {
      topic: 'V6800Upload/2437871205/LabelState',
      rawType: 'u_state_changed_notify_req',
    },
    deviceId: '2437871205',
    deviceType: 'V6800',
    messageType: 'RFID_EVENT',
    messageId: '550e8400-e29b-41d4-a716-446655440007',
    data: [
      {
        moduleIndex: 2,
        moduleId: '1234567891',
        data: [
          {
            sensorIndex: 10,
            action: 'DETACHED',
            tagId: 'DD344A45',
            isAlarm: false,
          },
        ],
      },
    ],
  },

  expectedSUO: {
    suoType: 'SUO_RFID_EVENT',
    deviceId: '2437871205',
    deviceType: 'V6800',
    moduleIndex: 2,
    moduleId: '1234567891',
    serverTimestamp: '[SERVER_TIMESTAMP]',
    deviceTimestamp: null,
    messageId: '550e8400-e29b-41d4-a716-446655440007',
    data: {
      events: [
        {
          sensorIndex: 10,
          action: 'DETACHED',
          tagId: 'DD344A45',
          isAlarm: false,
        },
      ],
    },
  },
};

/**
 * V6800 RFID_EVENT - Multiple sensors with alarm
 */
export const V6800_RFID_EVENT_MULTIPLE_ALARM = {
  description: 'V6800 RFID_EVENT with multiple sensors and alarm',
  topic: 'V6800Upload/2437871205/LabelState',

  rawJson: {
    msg_type: 'u_state_changed_notify_req',
    gateway_sn: '2437871205',
    uuid_number: '550e8400-e29b-41d4-a716-446655440008',
    data: [
      {
        host_gateway_port_index: 1,
        extend_module_sn: '1234567890',
        u_data: [
          {
            u_index: 5,
            new_state: 1,
            old_state: 0,
            tag_code: 'DD344A44',
            warning: 1,
          },
          {
            u_index: 6,
            new_state: 1,
            old_state: 0,
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
      rawType: 'u_state_changed_notify_req',
    },
    deviceId: '2437871205',
    deviceType: 'V6800',
    messageType: 'RFID_EVENT',
    messageId: '550e8400-e29b-41d4-a716-446655440008',
    data: [
      {
        moduleIndex: 1,
        moduleId: '1234567890',
        data: [
          {
            sensorIndex: 5,
            action: 'ATTACHED',
            tagId: 'DD344A44',
            isAlarm: true,
          },
          {
            sensorIndex: 6,
            action: 'ATTACHED',
            tagId: 'DD344A46',
            isAlarm: false,
          },
        ],
      },
    ],
  },

  expectedSUO: {
    suoType: 'SUO_RFID_EVENT',
    deviceId: '2437871205',
    deviceType: 'V6800',
    moduleIndex: 1,
    moduleId: '1234567890',
    serverTimestamp: '[SERVER_TIMESTAMP]',
    deviceTimestamp: null,
    messageId: '550e8400-e29b-41d4-a716-446655440008',
    data: {
      events: [
        {
          sensorIndex: 5,
          action: 'ATTACHED',
          tagId: 'DD344A44',
          isAlarm: true,
        },
        {
          sensorIndex: 6,
          action: 'ATTACHED',
          tagId: 'DD344A46',
          isAlarm: false,
        },
      ],
    },
  },
};

// Export all RFID_EVENT fixtures
export const V6800_RFID_EVENT_FIXTURES = [
  V6800_RFID_EVENT_ATTACHED,
  V6800_RFID_EVENT_DETACHED,
  V6800_RFID_EVENT_MULTIPLE_ALARM,
];
