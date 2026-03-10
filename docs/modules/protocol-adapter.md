# Protocol Adapter Module

Aligns device-specific behaviors between V5008 (binary) and V6800 (JSON) IoT gateways through protocol abstraction and event unification.

---

## Overview

The Protocol Adapter module bridges the gap between heterogeneous device protocols, providing a unified interface for consuming applications. It handles device-specific quirks and normalizes events across different gateway types.

**Key Responsibilities:**

- Unify RFID event handling between V5008 and V6800 devices
- Handle V6800-specific query requirements for RFID events
- Implement event deduplication across device types
- Provide extensible architecture for future protocol adaptations

**Supported Devices:**

| Device | Protocol | RFID Event Source                                          |
| ------ | -------- | ---------------------------------------------------------- |
| V5008  | Binary   | RFID_SNAPSHOT (continuous polling)                         |
| V6800  | JSON     | RFID_EVENT (event-driven) + RFID_SNAPSHOT (query response) |

---

## Features

### 1. RFID Event Unification

Both V5008 and V6800 devices emit identical `SUO_RFID_EVENT` messages, despite different underlying protocols:

**V5008 Flow:**

```
RFID_SNAPSHOT (periodic) ──▶ Compare with cache ──▶ Emit SUO_RFID_EVENT
```

**V6800 Flow:**

```
RFID_EVENT (triggered) ──▶ Query RFID_SNAPSHOT ──▶ Compare with cache ──▶ Emit SUO_RFID_EVENT
```

### 2. V6800 Query Handling

V6800 devices require explicit snapshot queries when RFID events occur:

- Receives `RFID_EVENT` from device
- Automatically triggers `RFID_SNAPSHOT` query
- Processes response to detect changes
- Emits unified `SUO_RFID_EVENT`

### 3. Deduplication

Prevents duplicate RFID events within a configurable time window:

- Deduplication key: `{deviceId}:{moduleIndex}:{sensorIndex}:{action}:{tagId}`
- Configurable window: Default 5 seconds
- Automatic cleanup of old entries

### 4. Change Detection

Compares RFID snapshots to detect:

- **ATTACHED**: New tag detected on sensor
- **DETACHED**: Tag removed from sensor
- **SWAPPED**: Tag replaced (emits DETACH + ATTACH)

---

## Configuration

### Protocol Adapter Configuration

```typescript
interface ProtocolAdapterConfig {
  enabled: boolean; // Enable/disable module
  dedupWindowMs: number; // Deduplication window in milliseconds
}
```

### Default Configuration

```typescript
const defaultConfig: ProtocolAdapterConfig = {
  enabled: true,
  dedupWindowMs: 5000, // 5 seconds
};
```

### Environment Variables

```bash
# Protocol Adapter Module
PROTOCOL_ADAPTER_ENABLED=true
PROTOCOL_ADAPTER_DEDUP_WINDOW=5000
```

---

## RFID Event Unification

### V5008 Flow Diagram

```
Device V5008
     │
     │ RFID_SNAPSHOT (periodic)
     ▼
┌─────────────────────┐
│ Protocol Adapter    │
│                     │
│ ┌─────────────────┐ │
│ │ RFID Unifier    │ │
│ │                 │ │
│ │ 1. Get previous │ │◀──────┐
│ │    state from   │ │       │
│ │    cache        │ │       │
│ │                 │ │       │
│ │ 2. Compare with │ │       │
│ │    new snapshot │ │       │
│ │                 │ │       │
│ │ 3. Detect       │ │       │
│ │    changes      │ │       │
│ │                 │ │       │
│ │ 4. Update cache │ │───────┘
│ │                 │ │
│ │ 5. Emit         │ │
│ │    SUO_RFID_    │ │
│ │    EVENT        │ │
│ └─────────────────┘ │
└──────────┬──────────┘
           │
           ▼
    SUO_RFID_EVENT
    (ATTACHED/DETACHED)
```

### V6800 Flow Diagram

```
Device V6800
     │
     │ RFID_EVENT (event-driven)
     ▼
┌─────────────────────┐
│ Protocol Adapter    │
│                     │
│ ┌─────────────────┐ │
│ │ RFID Unifier    │ │
│ │                 │ │
│ │ 1. Trigger      │ │
│ │    snapshot     │ │
│ │    query        │ │
│ │                 │ │
│ │ 2. Wait for     │ │◀─── RFID_SNAPSHOT
│ │    response     │ │     (response)
│ │                 │ │
│ │ 3. Get previous │ │◀──────┐
│ │    state from   │ │       │
│ │    cache        │ │       │
│ │                 │ │       │
│ │ 4. Compare with │ │       │
│ │    new snapshot │ │       │
│ │                 │ │       │
│ │ 5. Detect       │ │       │
│ │    changes      │ │       │
│ │                 │ │       │
│ │ 6. Update cache │ │───────┘
│ │                 │ │
│ │ 7. Emit         │ │
│ │    SUO_RFID_    │ │
│ │    EVENT        │ │
│ └─────────────────┘ │
└──────────┬──────────┘
           │
           ▼
    SUO_RFID_EVENT
    (ATTACHED/DETACHED)
```

### Unified Event Format

All devices emit the same `SUO_RFID_EVENT` structure:

```typescript
interface SUORfidEvent {
  suoType: 'SUO_RFID_EVENT';
  deviceId: string;
  deviceType: 'V5008' | 'V6800';
  moduleIndex: number;
  moduleId: string;
  serverTimestamp: string;
  deviceTimestamp: string | null;
  messageId: string;
  data: {
    sensorIndex: number;
    tagId: string;
    action: 'ATTACHED' | 'DETACHED';
    isAlarm: boolean;
  };
}
```

**Example Event:**

```json
{
  "suoType": "SUO_RFID_EVENT",
  "deviceId": "2437871205",
  "deviceType": "V5008",
  "moduleIndex": 0,
  "moduleId": "RFID-MOD-001",
  "serverTimestamp": "2024-01-15T10:30:00.000Z",
  "deviceTimestamp": null,
  "messageId": "rfid-1705314600000-000001",
  "data": {
    "sensorIndex": 3,
    "tagId": "E200341502001080",
    "action": "ATTACHED",
    "isAlarm": false
  }
}
```

---

## Events

### Events Listened To

| Event              | Payload           | Handler              |
| ------------------ | ----------------- | -------------------- |
| `SUO_MQTT_MESSAGE` | `SUOMessageEvent` | `handleSUOMessage()` |

**Message Types Processed:**

| SUO Type        | Source Device | Action                     |
| --------------- | ------------- | -------------------------- |
| `RFID_SNAPSHOT` | V5008, V6800  | Process and detect changes |
| `RFID_EVENT`    | V6800 only    | Trigger snapshot query     |

### Events Emitted

| Event              | Payload                     | Trigger                   |
| ------------------ | --------------------------- | ------------------------- |
| `COMMAND_PUBLISH`  | `CommandPublishEvent`       | V6800 RFID snapshot query |
| `SUO_MQTT_MESSAGE` | `{ message: SUORfidEvent }` | RFID change detected      |

---

## Usage Example

### Basic Setup

```typescript
import { ProtocolAdapterModule } from '@modules/protocol-adapter';
import { UOSCacheManager } from '@modules/cache';

// Initialize cache
const cacheManager = new UOSCacheManager();

// Configure Protocol Adapter
const config = {
  enabled: true,
  dedupWindowMs: 5000, // 5 second dedup window
};

// Create and start module
const protocolAdapter = new ProtocolAdapterModule(config, cacheManager.getCache());

protocolAdapter.start();
```

### Listening to Unified Events

```typescript
import { eventBus, SystemEvents } from '@core/event-bus';
import { isSUORfidEvent } from '@t/suo.types';

eventBus.on(SystemEvents.SUO_MQTT_MESSAGE, event => {
  const { message } = event;

  if (isSUORfidEvent(message)) {
    console.log('RFID Event:', {
      device: message.deviceId,
      module: message.moduleIndex,
      sensor: message.data.sensorIndex,
      action: message.data.action,
      tagId: message.data.tagId,
    });
  }
});
```

### Query Commands

**V5008 RFID Snapshot Query:**

```typescript
// Topic: V5008Download/{deviceId}
// Payload: 0xe9 0x01 {moduleIndex}
const payload = Buffer.from([0xe9, 0x01, moduleIndex]);
```

**V6800 RFID Snapshot Query:**

```typescript
// Topic: V6800Download/{deviceId}
// Payload: JSON command
const payload = Buffer.from(
  JSON.stringify({
    msg_type: 'u_state_req',
    gateway_port_index: moduleIndex,
  })
);
```

---

## Module Lifecycle

```
┌──────────────────────────────────────────────────────────────┐
│                    Protocol Adapter Module                    │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────┐    ┌──────────────┐    ┌───────────────────┐   │
│  │  Start   │───▶│ Subscribe to │───▶│ Route Messages    │   │
│  │          │    │ SUO_MQTT_MSG │    │                   │   │
│  └──────────┘    └──────────────┘    └─────────┬─────────┘   │
│                                                │              │
│                        ┌───────────────────────┼───────┐      │
│                        │                       │       │      │
│                        ▼                       ▼       ▼      │
│                 ┌────────────┐         ┌────────────┐ ┌────┐ │
│                 │RFID_SNAPSHOT│        │ RFID_EVENT │ │... │ │
│                 └─────┬──────┘         └─────┬──────┘ └────┘ │
│                       │                      │               │
│                       ▼                      ▼               │
│                 ┌────────────┐         ┌────────────┐        │
│                 │RFID Unifier│         │RFID Unifier│        │
│                 │            │         │ (query)    │        │
│                 │ Detect     │         │            │        │
│                 │ Changes    │         │ Emit Event │        │
│                 └─────┬──────┘         └─────┬──────┘        │
│                       │                      │               │
│                       └──────────┬───────────┘               │
│                                  ▼                           │
│                          SUO_RFID_EVENT                     │
│                                                               │
│  ┌──────────┐    ┌──────────────┐                            │
│  │   Stop   │◀───│  Unsubscribe │                            │
│  │          │    │   from Bus   │                            │
│  └──────────┘    └──────────────┘                            │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
src/modules/protocol-adapter/
├── index.ts              # Module exports
├── protocol-adapter.ts   # Main Protocol Adapter module
└── rfid-unifier.ts       # RFID unification logic
```

---

## Dependencies

| Module              | Purpose                          |
| ------------------- | -------------------------------- |
| `core/event-bus`    | Event subscription and emission  |
| `modules/cache`     | UOS cache for RFID state storage |
| `types/suo.types`   | SUO message type definitions     |
| `types/event.types` | Event type definitions           |
| `utils/logger`      | Structured logging               |

---

## Future Extensions

The Protocol Adapter module is designed for extensibility. Future adaptations may include:

### Planned Extensions

| Feature                     | Description                                   | Priority |
| --------------------------- | --------------------------------------------- | -------- |
| Command Unification         | Normalize command formats between V5008/V6800 | Medium   |
| Alarm Unification           | Unified alarm event format                    | Medium   |
| Device Capability Discovery | Auto-detect device capabilities               | Low      |
| Protocol Version Handling   | Support multiple protocol versions            | Low      |

### Adding New Protocol Adaptations

To add a new protocol adaptation:

1. **Create adapter file:** `src/modules/protocol-adapter/{feature}-adapter.ts`
2. **Implement adapter interface:**

```typescript
export interface FeatureAdapter {
  processV5008(message: SUOMessage): void;
  processV6800(message: SUOMessage): void;
  updateConfig(config: Partial<FeatureConfig>): void;
}
```

3. **Register in ProtocolAdapterModule:**

```typescript
export class ProtocolAdapterModule {
  private featureAdapter: FeatureAdapter;

  constructor(config: ProtocolAdapterConfig, cache: IUOSCache) {
    // ... existing code ...
    this.featureAdapter = new FeatureAdapter(config, cache);
  }

  private handleSUOMessage(event: SUOMessageEvent): void {
    // ... existing handlers ...
    if (isFeatureMessage(message)) {
      this.handleFeatureMessage(message);
    }
  }
}
```

4. **Add configuration options:**

```typescript
interface ProtocolAdapterConfig {
  // ... existing options ...
  enableFeatureUnification: boolean;
  featureDedupWindowMs: number;
}
```

5. **Update documentation** with new feature details
