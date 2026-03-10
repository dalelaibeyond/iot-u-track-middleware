/**
 * V5008 Test Fixtures
 * 
 * Binary message fixtures for V5008 device protocol
 * Based on V5008_Spec.md
 */

// ============================================================================
// V5008 HEARTBEAT Message Fixtures
// Topic: V5008Upload/{deviceId}/OpeAck
// Header: 0xCC (normal) or 0xCB (boot)
// ============================================================================

/**
 * V5008 HEARTBEAT - Single module online
 * 
 * Binary format:
 * Header(1) + [ModAddr(1) + ModId(4) + Total(1)] × 10 + MsgId(4)
 * 
 * This fixture represents a device with 1 module connected at position 1
 */
export const V5008_HEARTBEAT_SINGLE_MODULE = {
  description: 'V5008 HEARTBEAT with 1 module online',
  topic: 'V5008Upload/2437871205/OpeAck',
  
  // Raw binary buffer (hex representation)
  rawHex: 'CC0101234567890A3601000000000000000000000000000000000000000000000000000000002710',
  
  // Parsed binary structure
  rawBuffer: Buffer.from([
    // Header
    0xCC,                           // Header byte (HEARTBEAT)
    
    // Module 1 (online)
    0x01,                           // ModAddr = 1
    0x01, 0x23, 0x45, 0x67,        // ModId = 19088743 (big-endian)
    0x36,                           // Total = 54 slots
    
    // Modules 2-10 (empty, ModId = 0)
    0x02, 0x00, 0x00, 0x00, 0x00, 0x00,  // Module 2: empty
    0x03, 0x00, 0x00, 0x00, 0x00, 0x00,  // Module 3: empty
    0x04, 0x00, 0x00, 0x00, 0x00, 0x00,  // Module 4: empty
    0x05, 0x00, 0x00, 0x00, 0x00, 0x00,  // Module 5: empty
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00,  // Module 6: empty (invalid ModAddr, should be filtered)
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00,  // Module 7: empty
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00,  // Module 8: empty
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00,  // Module 9: empty
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00,  // Module 10: empty
    
    // Message ID (last 4 bytes)
    0x00, 0x00, 0x27, 0x10,        // MsgId = 10000 (big-endian)
  ]),
  
  // Expected parsing result
  expected: {
    header: 0xCC,
    messageType: 'HEARTBEAT',
    deviceId: '2437871205',         // Extracted from topic
    messageId: '10000',             // Algorithm D: readUInt32BE
    modules: [
      {
        moduleIndex: 1,
        moduleId: '19088743',       // 0x01234567 as decimal string
        uTotal: 54,
      },
    ],
    // Note: Only modules with ModId != 0 and ModAddr <= 5 should be included
  },
};

/**
 * V5008 HEARTBEAT - Boot notification
 * Header: 0xCB (same format as 0xCC)
 */
export const V5008_HEARTBEAT_BOOT = {
  description: 'V5008 HEARTBEAT boot notification',
  topic: 'V5008Upload/2437871205/OpeAck',
  
  rawHex: 'CB0101234567890A3601000000000000000000000000000000000000000000000000000000002710',
  
  rawBuffer: Buffer.from([
    0xCB,                           // Header byte (HEARTBEAT boot)
    0x01, 0x01, 0x23, 0x45, 0x67, 0x36,
    0x02, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x03, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x04, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x05, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x27, 0x10,
  ]),
  
  expected: {
    header: 0xCB,
    messageType: 'HEARTBEAT',
    deviceId: '2437871205',
    messageId: '10000',
    modules: [
      {
        moduleIndex: 1,
        moduleId: '19088743',
        uTotal: 54,
      },
    ],
  },
};

/**
 * V5008 HEARTBEAT - Multiple modules (3 modules)
 */
export const V5008_HEARTBEAT_MULTIPLE_MODULES = {
  description: 'V5008 HEARTBEAT with 3 modules online',
  topic: 'V5008Upload/2437871205/OpeAck',
  
  rawBuffer: Buffer.from([
    0xCC,                           // Header
    
    // Module 1
    0x01,                           // ModAddr = 1
    0x01, 0x23, 0x45, 0x67,        // ModId = 19088743
    0x36,                           // Total = 54
    
    // Module 2
    0x02,                           // ModAddr = 2
    0x89, 0xAB, 0xCD, 0xEF,        // ModId = 2309737967
    0x36,                           // Total = 54
    
    // Module 3
    0x03,                           // ModAddr = 3
    0x12, 0x34, 0x56, 0x78,        // ModId = 305419896
    0x36,                           // Total = 54
    
    // Modules 4-10 (empty)
    0x04, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x05, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    
    // Message ID
    0x00, 0x01, 0x86, 0xA0,        // MsgId = 100000
  ]),
  
  expected: {
    header: 0xCC,
    messageType: 'HEARTBEAT',
    deviceId: '2437871205',
    messageId: '100000',
    modules: [
      { moduleIndex: 1, moduleId: '19088743', uTotal: 54 },
      { moduleIndex: 2, moduleId: '2309737967', uTotal: 54 },
      { moduleIndex: 3, moduleId: '305419896', uTotal: 54 },
    ],
  },
};

// Export all HEARTBEAT fixtures
export const V5008_HEARTBEAT_FIXTURES = [
  V5008_HEARTBEAT_SINGLE_MODULE,
  V5008_HEARTBEAT_BOOT,
  V5008_HEARTBEAT_MULTIPLE_MODULES,
];
