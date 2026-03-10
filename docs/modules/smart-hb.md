# SmartHB Module

Smart Heartbeat processing module with Device Info Repair capabilities for V5008 and V6800 IoT gateways.

---

## Overview

The SmartHB module monitors heartbeat and device information messages from IoT gateways, automatically building complete device metadata from partial updates. It implements intelligent query mechanisms with cooldown periods to prevent spam and ensure efficient communication with devices.

**Key Responsibilities:**

- Monitor device heartbeats and device info messages
- Build complete SUO_DEV_MOD from partial updates (DEVICE_INFO, MODULE_INFO, HEARTBEAT)
- Automatically query missing device/module information
- Implement cooldown to prevent duplicate queries
- Emit unified device info events when data is complete

---

## Features

### 1. Heartbeat Processing

Monitors SUO_HEARTBEAT messages from all devices, extracting module information and triggering device info queries when cached data is incomplete.

**Supported Devices:**

| Device | Protocol | Heartbeat Format        |
| ------ | -------- | ----------------------- |
| V5008  | Binary   | Periodic module status  |
| V6800  | JSON     | Periodic telemetry data |

### 2. Device Info Repair

The Device Info Repair subsystem builds complete device metadata by merging partial updates from multiple sources:

- **DEVICE_INFO**: Contains device-level fields (IP, MAC, firmware version)
- **MODULE_INFO**: Contains module-level fields (module IDs, firmware versions)
- **HEARTBEAT**: Contains live module status (module indices, tag counts)

### 3. Multi-Source Merging

Aggregates data from different message types into a unified device state:

```
DEVICE_INFO ─┐
             ├─→ [DeviceInfoRepair] ─→ Complete SUO_DEV_MOD ─→ UOS Cache
MODULE_INFO ─┤              │
             │              └─→ SUO_MQTT_MESSAGE (when complete)
HEARTBEAT ───┘
```

### 4. Query Deduplication

Prevents duplicate queries using a configurable cooldown mechanism:

- Per-device query tracking
- Per-module query tracking
- Automatic cleanup of old query records (after 1 hour)
- Configurable cooldown period (default: 30 seconds)

---

## Configuration

### SmartHB Configuration

```typescript
interface SmartHBConfig {
  enabled: boolean; // Enable/disable module
  queryCooldown: number; // Milliseconds between queries (default: 30000)
  triggerOnHeartbeat: boolean; // Process heartbeat messages (default: true)
  enableDeviceInfoRepair: boolean; // Enable repair feature (default: true)
}
```

### Default Configuration

```typescript
const defaultConfig: SmartHBConfig = {
  enabled: true,
  queryCooldown: 30000, // 30 seconds
  triggerOnHeartbeat: true,
  enableDeviceInfoRepair: true,
};
```

### Environment Variables

```bash
# SmartHB Module
SMART_HB_ENABLED=true
SMART_HB_QUERY_COOLDOWN=30000
SMART_HB_TRIGGER_ON_HEARTBEAT=true
SMART_HB_ENABLE_REPAIR=true
```

---

## Device Info Repair Logic

### V5008 Multi-Source Building

For V5008 devices, device information arrives through three distinct message types:

| Message Type | Source        | Fields Provided               |
| ------------ | ------------- | ----------------------------- |
| HEARTBEAT    | OpeAck        | moduleIndex, moduleId, uTotal |
| DEVICE_INFO  | DeviceInfoAck | ip, mac, fwVer, mask, gwIp    |
| MODULE_INFO  | ModuleInfoAck | moduleIndex, moduleId, fwVer  |

**Building Process:**

```
HEARTBEAT (OpeAck)
  ├── Module indices detected
  └── Store in partialDevMod.modules[]

DEVICE_INFO (DeviceInfoAck)
  ├── Device IP, MAC, firmware
  └── Merge into partialDevMod.data{ip, mac, fwVer, ...}

MODULE_INFO (ModuleInfoAck)
  ├── Module firmware versions
  └── Merge into partialDevMod.modules[].fwVer
```

### Completion Criteria

A device's information is considered **complete** when:

1. **Device-level fields present:**
   - `ip`: Device IP address
   - `mac`: Device MAC address
   - `fwVer`: Device firmware version

2. **All detected modules have:**
   - `moduleIndex`: Module position/index
   - `moduleId`: Unique module identifier
   - `fwVer`: Module firmware version

3. **Heartbeat has been received** (to determine module count)

**Completion Check:**

```typescript
const completionStatus = checkDeviceInfoCompletion(partialDevMod);

if (completionStatus.isComplete) {
  // Emit complete SUO_DEV_MOD
  emitCompleteDevMod(partialDevMod);
} else {
  // Query missing information
  queryMissingInfo(deviceId, deviceType, completionStatus);
}
```

### Database Persistence Rules

When device info becomes complete:

1. **UOS Cache Update**: Full device metadata merged into cache
2. **SUO_MQTT_MESSAGE Emitted**: Complete SUO_DEV_MOD broadcast via EventBus
3. **Database Write**: Handled by DatabaseWriter module (if enabled)

**Persistence Priority:**

| Field Category    | Source                  | Persistence Action           |
| ----------------- | ----------------------- | ---------------------------- |
| Device metadata   | DEVICE_INFO             | Update UOS device entry      |
| Module list       | MODULE_INFO + HEARTBEAT | Update UOS module entries    |
| Firmware versions | MODULE_INFO             | Update module firmware field |
| IP/MAC/Gateway    | DEVICE_INFO             | Update network fields        |

---

## Events

### Events Listened To

| Event              | Payload           | Handler              |
| ------------------ | ----------------- | -------------------- |
| `SUO_MQTT_MESSAGE` | `SUOMessageEvent` | `handleSUOMessage()` |

### Events Emitted

| Event              | Payload                  | Condition                    |
| ------------------ | ------------------------ | ---------------------------- |
| `COMMAND_PUBLISH`  | `CommandPublishEvent`    | Query command sent to device |
| `SUO_MQTT_MESSAGE` | `{ message: SUODevMod }` | Device info becomes complete |

---

## Usage Example

### Basic Setup

```typescript
import { SmartHBModule } from '@modules/smart-hb';
import { UOSCacheManager } from '@modules/cache';

// Initialize cache manager
const cacheManager = new UOSCacheManager();

// Configure SmartHB
const config = {
  enabled: true,
  queryCooldown: 30000, // 30 second cooldown
  triggerOnHeartbeat: true,
  enableDeviceInfoRepair: true,
};

// Create and start module
const smartHB = new SmartHBModule(config, cacheManager);
smartHB.start();
```

### Checking Device Completion Status

```typescript
// Get Device Info Repair instance
const repair = smartHB.getDeviceInfoRepair();

// Check if specific device info is complete
const isComplete = repair.isDeviceInfoComplete('device-001');
console.log(`Device info complete: ${isComplete}`);
```

### Updating Configuration

```typescript
// Update config at runtime
smartHB.updateConfig({
  queryCooldown: 60000, // Increase to 60 seconds
  enableDeviceInfoRepair: false, // Disable repair temporarily
});
```

### Query Commands by Device Type

**V5008 Queries:**

```typescript
// Query device info
// Topic: V5008Download/{deviceId}
// Payload: 0xef 0x01

// Query module info
// Topic: V5008Download/{deviceId}
// Payload: 0xef 0x02
```

**V6800 Queries:**

```typescript
// Query device info
// Topic: V6800Download/{deviceId}
// Payload: { msg_type: 'get_device_info_req', msg_code: 200 }

// Query module info
// Topic: V6800Download/{deviceId}
// Payload: { msg_type: 'get_module_info_req', msg_code: 200 }
```

---

## Module Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                        SmartHB Module                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │  Start   │───▶│ Subscribe to │───▶│ Process Messages │  │
│  │          │    │ SUO_MQTT_MSG │    │                  │  │
│  └──────────┘    └──────────────┘    └────────┬─────────┘  │
│                                               │             │
│  ┌──────────┐    ┌──────────────┐    ┌────────▼─────────┐  │
│  │   Stop   │◀───│  Unsubscribe │◀───│  Update/Query    │  │
│  │          │    │   from Bus   │    │                  │  │
│  └──────────┘    └──────────────┘    └──────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
src/modules/smart-hb/
├── index.ts                 # Module exports
├── smart-hb.ts             # Main SmartHB module
└── device-info-repair.ts   # Device Info Repair logic
```

---

## Dependencies

| Module              | Purpose                         |
| ------------------- | ------------------------------- |
| `core/event-bus`    | Event subscription and emission |
| `modules/cache`     | UOS cache access and updates    |
| `types/suo.types`   | SUO message type definitions    |
| `types/event.types` | Event type definitions          |
| `utils/logger`      | Structured logging              |
