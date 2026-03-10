# Middleware Simulator CLI Tool - Design Document

**Date:** 2026-03-06  
**Status:** Approved for Implementation  
**Author:** Design Discussion  

---

## 1. Executive Summary

A standalone CLI tool that validates the MQTT Middleware Pro pipeline by running the actual middleware stack in a controlled test environment. Device emulators send realistic raw messages through an MQTT broker, and the simulator validates the complete transformation from RAW → SIF → SUO including SmartHB device repair and ProtocolAdapter RFID unification.

---

## 2. Goals

- Validate message parsing for V5008 (binary) and V6800 (JSON) protocols
- Verify SmartHB device info repair logic with query/repair cycles
- Confirm ProtocolAdapter RFID event unification across device types
- Ensure middleware correctness before dashboardPro integration testing
- Provide fast, repeatable test suite for CI/CD integration

---

## 3. Architecture

```
simulator/
├── src/
│   ├── cli.ts                    # CLI entry point
│   ├── runner/
│   │   ├── test-runner.ts        # Test orchestration
│   │   └── test-scenario.ts      # Test scenario interface
│   ├── emulators/
│   │   ├── v5008-emulator.ts     # V5008 binary protocol
│   │   └── v6800-emulator.ts     # V6800 JSON protocol
│   ├── validator/
│   │   └── validator.ts          # Assertion logic
│   ├── scenarios/
│   │   ├── v5008-tests.ts
│   │   ├── v6800-tests.ts
│   │   ├── smarthb-tests.ts
│   │   └── protocol-tests.ts
│   └── broker/
│       └── embedded-broker.ts    # MQTT broker (aedes)
├── fixtures/                     # Test message samples
└── tests/
    └── simulator.spec.ts
```

---

## 4. Key Features

### Test Scenarios
1. **V5008/V6800 Message Parsing** - Basic heartbeat, device info parsing
2. **SmartHB Device Repair** - Incomplete data detection, query triggers, repair cycles
3. **ProtocolAdapter RFID** - V5008 vs V6800 event unification
4. **Cache State** - Multi-message state persistence
5. **Command Flow** - Request → publish → response cycle
6. **Edge Cases** - Malformed messages, timeouts, empty data

### CLI Interface
```bash
npm run simulator                          # Run all tests
npm run simulator -- --pattern "SmartHB*"  # Filter tests
npm run simulator -- --verbose             # Detailed output
npm run simulator -- --format json         # JSON output for CI/CD
```

### Validation Engine
- Wait for async SUO messages with timeouts
- Assert message structure and content
- Verify cache state changes
- Check timing constraints
- Count events by type

---

## 5. Integration

### Package.json Scripts
```json
{
  "scripts": {
    "simulator": "cd simulator && npm run start",
    "simulator:build": "cd simulator && npm run build",
    "test:integration": "npm run simulator"
  }
}
```

### Test Environment
- Embedded MQTT broker (aedes)
- Middleware with database disabled
- In-memory cache only
- Real Parser/Normalizer/SmartHB/ProtocolAdapter modules

---

## 6. Success Criteria

- All 12 test scenarios pass consistently
- Test execution completes in < 30 seconds
- 100% coverage for Parser, Normalizer, SmartHB, ProtocolAdapter
- Zero false positives
- Easy to extend (add new scenario < 10 minutes)
- CI/CD ready (JSON output, exit codes)

---

## 7. Output Format

### Console
```
✓ V5008 Single Module Heartbeat Parsing (23ms)
✓ SmartHB Device Info Repair Cycle (1,234ms)
  ├─ Sent HEARTBEAT
  ├─ Query DEVICE_INFO triggered ✓
  └─ SUO_DEV_MOD saved ✓

Test Summary: 12 passed, 0 failed
Coverage: Parser(100%), Normalizer(100%), SmartHB(100%), ProtocolAdapter(100%)
```

### JSON
```json
{
  "summary": { "total": 12, "passed": 12, "failed": 0 },
  "coverage": {
    "parser": 100,
    "normalizer": 100,
    "smartHB": 100,
    "protocolAdapter": 100
  }
}
```

---

**Document End**
