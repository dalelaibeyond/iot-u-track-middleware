/**
 * V6800 MOD_CHNG_EVENT Test Fixtures
 *
 * JSON message fixtures for V6800 module change events
 * Based on v6800_spec.md
 */

// ============================================================================
// V6800 MOD_CHNG_EVENT Message Fixtures
// Topic: V6800Upload/{deviceId}/DeviceChange
// ============================================================================

/**
 * V6800 MOD_CHNG_EVENT - Single module added
 */
export const V6800_MOD_CHNG_EVENT_SINGLE = {
  description: 'V6800 MOD_CHNG_EVENT with 1 module',
  topic: 'V6800Upload/2437871205/DeviceChange',

  // Raw JSON as received from device
  rawJson: {
    msg_type: 'devices_changed_req',
    gateway_sn: '2437871205',
    uuid_number: '550e8400-e29b-41d4-a716-446655440002',
    data: [
      {
        module_type: 'RFID',
        module_sn: '9876543210',
        module_index: 3,
        module_m_num: 2001,
        module_u_num: 54,
        module_sw_version: '2.1.0',
        module_supplier: 'ManufacturerB',
        module_brand: 'BrandY',
        module_model: 'ModelZ',
      },
    ],
  },

  // Expected SIF output (after parsing)
  expectedSIF: {
    meta: {
      topic: 'V6800Upload/2437871205/DeviceChange',
      rawType: 'devices_changed_req',
    },
    deviceId: '2437871205',
    deviceType: 'V6800',
    messageType: 'MOD_CHNG_EVENT',
    messageId: '550e8400-e29b-41d4-a716-446655440002',
    data: [
      {
        moduleIndex: 3,
        moduleId: '9876543210',
        fwVer: '2.1.0',
        uTotal: 54,
      },
    ],
  },

  // Expected SUO output (after normalization)
  expectedSUO: {
    suoType: 'SUO_DEV_MOD',
    deviceId: '2437871205',
    deviceType: 'V6800',
    serverTimestamp: '[SERVER_TIMESTAMP]',
    deviceTimestamp: null,
    messageId: '550e8400-e29b-41d4-a716-446655440002',
    ip: null,
    mask: null,
    gwIp: null,
    mac: null,
    model: null,
    fwVer: null,
    modules: [
      {
        moduleIndex: 3,
        moduleId: '9876543210',
        fwVer: '2.1.0',
        uTotal: 54,
      },
    ],
  },
};

/**
 * V6800 MOD_CHNG_EVENT - Multiple modules changed
 */
export const V6800_MOD_CHNG_EVENT_MULTIPLE = {
  description: 'V6800 MOD_CHNG_EVENT with 2 modules',
  topic: 'V6800Upload/2437871205/DeviceChange',

  rawJson: {
    msg_type: 'devices_changed_req',
    gateway_sn: '2437871205',
    uuid_number: '550e8400-e29b-41d4-a716-446655440003',
    data: [
      {
        module_type: 'RFID',
        module_sn: '9876543210',
        module_index: 1,
        module_m_num: 2001,
        module_u_num: 54,
        module_sw_version: '2.1.0',
        module_supplier: 'ManufacturerB',
        module_brand: 'BrandY',
        module_model: 'ModelZ',
      },
      {
        module_type: 'RFID',
        module_sn: '9876543211',
        module_index: 2,
        module_m_num: 2002,
        module_u_num: 54,
        module_sw_version: '2.1.1',
        module_supplier: 'ManufacturerB',
        module_brand: 'BrandY',
        module_model: 'ModelZ',
      },
    ],
  },

  expectedSIF: {
    meta: {
      topic: 'V6800Upload/2437871205/DeviceChange',
      rawType: 'devices_changed_req',
    },
    deviceId: '2437871205',
    deviceType: 'V6800',
    messageType: 'MOD_CHNG_EVENT',
    messageId: '550e8400-e29b-41d4-a716-446655440003',
    data: [
      {
        moduleIndex: 1,
        moduleId: '9876543210',
        fwVer: '2.1.0',
        uTotal: 54,
      },
      {
        moduleIndex: 2,
        moduleId: '9876543211',
        fwVer: '2.1.1',
        uTotal: 54,
      },
    ],
  },

  expectedSUO: {
    suoType: 'SUO_DEV_MOD',
    deviceId: '2437871205',
    deviceType: 'V6800',
    serverTimestamp: '[SERVER_TIMESTAMP]',
    deviceTimestamp: null,
    messageId: '550e8400-e29b-41d4-a716-446655440003',
    ip: null,
    mask: null,
    gwIp: null,
    mac: null,
    model: null,
    fwVer: null,
    modules: [
      {
        moduleIndex: 1,
        moduleId: '9876543210',
        fwVer: '2.1.0',
        uTotal: 54,
      },
      {
        moduleIndex: 2,
        moduleId: '9876543211',
        fwVer: '2.1.1',
        uTotal: 54,
      },
    ],
  },
};

// Export all MOD_CHNG_EVENT fixtures
export const V6800_MOD_CHNG_EVENT_FIXTURES = [
  V6800_MOD_CHNG_EVENT_SINGLE,
  V6800_MOD_CHNG_EVENT_MULTIPLE,
];
