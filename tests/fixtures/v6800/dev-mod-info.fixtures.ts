/**
 * V6800 Test Fixtures
 *
 * JSON message fixtures for V6800 device protocol
 * Based on v6800_spec.md
 */

// ============================================================================
// V6800 DEV_MOD_INFO Message Fixtures
// Topic: V6800Upload/{deviceId}/Init
// ============================================================================

/**
 * V6800 DEV_MOD_INFO - Single module
 *
 * Raw format: JSON with device initialization info
 */
export const V6800_DEV_MOD_INFO_SINGLE_MODULE = {
  description: 'V6800 DEV_MOD_INFO with 1 module',
  topic: 'V6800Upload/2437871205/Init',

  // Raw JSON as received from device
  rawJson: {
    msg_type: 'devies_init_req',
    gateway_sn: '2437871205',
    gateway_ip: '192.168.1.100',
    gateway_mac: '80:82:91:4E:F6:65',
    uuid_number: '550e8400-e29b-41d4-a716-446655440000',
    data: [
      {
        module_type: 'RFID',
        module_index: '1',
        module_sn: 1234567890,
        module_m_num: 1001,
        module_u_num: 54,
        module_sw_version: '1.2.3',
        module_supplier: 'ManufacturerA',
        module_brand: 'BrandX',
        module_model: 'ModelY',
      },
    ],
  },

  // Expected SIF output (after parsing)
  expectedSIF: {
    meta: {
      topic: 'V6800Upload/2437871205/Init',
      rawType: 'devies_init_req',
    },
    deviceId: '2437871205',
    deviceType: 'V6800',
    messageType: 'DEV_MOD_INFO',
    messageId: '550e8400-e29b-41d4-a716-446655440000',
    ip: '192.168.1.100',
    mac: '80:82:91:4E:F6:65',
    data: [
      {
        moduleIndex: 1,
        moduleId: '1234567890',
        fwVer: '1.2.3',
        uTotal: 54,
      },
    ],
  },

  // Expected SUO output (after normalization)
  expectedSUO: {
    suoType: 'SUO_DEV_MOD',
    deviceId: '2437871205',
    deviceType: 'V6800',
    serverTimestamp: '[SERVER_TIMESTAMP]', // Added by server
    deviceTimestamp: null,
    messageId: '550e8400-e29b-41d4-a716-446655440000',
    ip: '192.168.1.100',
    mask: null,
    gwIp: null,
    mac: '80:82:91:4E:F6:65',
    model: null,
    fwVer: null,
    modules: [
      {
        moduleIndex: 1,
        moduleId: '1234567890',
        fwVer: '1.2.3',
        uTotal: 54,
      },
    ],
  },
};

/**
 * V6800 DEV_MOD_INFO - Multiple modules (2 modules)
 */
export const V6800_DEV_MOD_INFO_MULTIPLE_MODULES = {
  description: 'V6800 DEV_MOD_INFO with 2 modules',
  topic: 'V6800Upload/2437871205/Init',

  rawJson: {
    msg_type: 'devies_init_req',
    gateway_sn: '2437871205',
    gateway_ip: '192.168.1.100',
    gateway_mac: '80:82:91:4E:F6:65',
    uuid_number: '550e8400-e29b-41d4-a716-446655440001',
    data: [
      {
        module_type: 'RFID',
        module_index: '1',
        module_sn: 1234567890,
        module_m_num: 1001,
        module_u_num: 54,
        module_sw_version: '1.2.3',
        module_supplier: 'ManufacturerA',
        module_brand: 'BrandX',
        module_model: 'ModelY',
      },
      {
        module_type: 'RFID',
        module_index: '2',
        module_sn: 1234567891,
        module_m_num: 1002,
        module_u_num: 54,
        module_sw_version: '1.2.4',
        module_supplier: 'ManufacturerA',
        module_brand: 'BrandX',
        module_model: 'ModelY',
      },
    ],
  },

  expectedSIF: {
    meta: {
      topic: 'V6800Upload/2437871205/Init',
      rawType: 'devies_init_req',
    },
    deviceId: '2437871205',
    deviceType: 'V6800',
    messageType: 'DEV_MOD_INFO',
    messageId: '550e8400-e29b-41d4-a716-446655440001',
    ip: '192.168.1.100',
    mac: '80:82:91:4E:F6:65',
    data: [
      {
        moduleIndex: 1,
        moduleId: '1234567890',
        fwVer: '1.2.3',
        uTotal: 54,
      },
      {
        moduleIndex: 2,
        moduleId: '1234567891',
        fwVer: '1.2.4',
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
    messageId: '550e8400-e29b-41d4-a716-446655440001',
    ip: '192.168.1.100',
    mask: null,
    gwIp: null,
    mac: '80:82:91:4E:F6:65',
    model: null,
    fwVer: null,
    modules: [
      {
        moduleIndex: 1,
        moduleId: '1234567890',
        fwVer: '1.2.3',
        uTotal: 54,
      },
      {
        moduleIndex: 2,
        moduleId: '1234567891',
        fwVer: '1.2.4',
        uTotal: 54,
      },
    ],
  },
};

// Export all DEV_MOD_INFO fixtures
export const V6800_DEV_MOD_INFO_FIXTURES = [
  V6800_DEV_MOD_INFO_SINGLE_MODULE,
  V6800_DEV_MOD_INFO_MULTIPLE_MODULES,
];
