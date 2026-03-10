# Dashboard Product Requirements (PRD)

**File Name:** `dashboardPro_prd.md`

**Version**: 1.0

**Project:** IoT Ops Dashboard
**Type:** Frontend SPA (Single Page Application)
**Architecture:** Independent React App (Located in `dashboardPro/` subdirectory)
**Date:** 2026-03-04
**Status:** Final

---

## 1. Technical Stack (Strict Constraints)

- **Build Tool:** Vite 5+
- **Framework:** React 18+ (Hooks, Functional Components)
- **Language:** TypeScript 5+ (Strict Mode)
- **Styling:** Tailwind CSS (Mobile responsive)
- **State Management:** Zustand (Global Store)
- **Networking:** Axios (REST) + Native WebSocket API
- **Icons:** Lucide-React

---

## 2. Project Structure

**Constraint:** The frontend application MUST reside in a sub-folder named **`dashboardPro/`** within the project root.

```
dashboardPro/
├── src/
│   ├── api/             # Axios client & endpoints
│   ├── components/
│   │   ├── layout/      # Sidebar, TopBar, MainLayout
│   │   ├── rack/        # Visualizers (RackStrip, DoorPanel, EnvList)
│   │   └── ui/          # Generic atoms (Card, Badge, Button)
│   ├── hooks/           # useSocket, useRackData
│   ├── store/           # Zustand (useIoTStore)
│   └── types/           # TS Interfaces (Schema)

...
```

---

## 3. API Reference

**For complete API documentation, see [`API.md`](API.md).**

**Base URL:** `http://localhost:3000/api/v1`  
**WebSocket:** `ws://localhost:3001/ws`

### 3.1 Dashboard-Specific API Usage

| Endpoint                  | Purpose           | Data Used                                                              |
| ------------------------- | ----------------- | ---------------------------------------------------------------------- |
| `GET /api/v1/devices`     | Device list       | `deviceId`, `isOnline`, `moduleCount`                                  |
| `GET /api/v1/devices/:id` | Device detail     | `network.ip`, `firmware.version`, `modules[]`                          |
| `POST /api/v1/commands`   | Send commands     | `QUERY_RFID_SNAPSHOT`, `CLEAR_ALARM`                                   |
| `WebSocket`               | Real-time updates | `SUO_RFID_SNAPSHOT`, `SUO_TEMP_HUM`, `SUO_DOOR_STATE`, `SUO_HEARTBEAT` |

---

## 4. UI Layout & Visuals

The app uses a **Sidebar Navigation** layout with a **Master-Detail** view.

### 4.1 Left Sidebar (Navigation)

- **Data Source:** `GET /api/v1/devices` + WebSocket updates.
- **Structure:** Accordion List.
  - **Level 1 (Device):** Shows `deviceId` + Online Status Dot (Green/Gray).
  - **Level 2 (Module):** Shows `Module #{index}`.
- **Behavior:** Clicking a Module sets it as the `activeRack` in the store.

### 4.2 Top Bar (Context)

- **Left:** Breadcrumbs (`Device ID > Module Index`).
- **Right:**
  - **Device Meta:** IP Address (from `network.ip`), Firmware Version (from `firmware.version`).
  - **Connection Badge:** WebSocket Status (Live [Green] / Disconnected [Red]).

### 4.3 Main Panel (The Rack Digital Twin)

A consolidated view divided into 3 horizontal zones:

| Zone       | Component   | Description     | Logic                                                                                                                                                                                                       |
| ---------- | ----------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| **Left**   | `DoorPanel` | Security Status | **Single Door:** Show 1 Icon.<br>**Dual Door:** Show Front/Rear Icons.<br>**State:** Green (Closed=0), Red/Pulse (Open=1). Data from `telemetry.doorState.door1` and `door2`.                               |
| **Center** | `RackStrip` | U-Level Grid    | **Height:** Dynamic based on `uTotal` (from module).<br>**Order:** U-Max (Top) to U1 (Bottom).<br>**Slot:** Color if RFID occupied (from `rfidSnapshot.data`), Gray if empty, Blink Red if `isAlarm: true`. |
| **Right**  | `EnvList`   | Sensor Data     | Vertical list of cards.<br>**Format:** `#{index}: 24.5°C                                                                                                                                                    | 50%`<br>Data from `telemetry.tempHum.data`. |

---

## 5. Data Logic & State Management

### 5.1 Data Contracts (TypeScript)

Must match the Backend SUO (Standard Unified Object).

```tsx
// Device from GET /api/v1/devices
interface Device {
  deviceId: string;
  deviceType: 'V5008' | 'V6800';
  isOnline: boolean;
  moduleCount: number;
  lastSeen: string;
  ip: string;
  mac: string;
}

// Module from GET /api/v1/devices/:id
interface Module {
  moduleIndex: number;
  moduleId: string;
  uTotal: number;
  isOnline: boolean;
  lastSeenHb: string;
  telemetry: {
    tempHum: {
      data: Array<{
        sensorIndex: number;
        temp: number;
        hum: number;
      }>;
      lastSeen: string;
    };
    rfidSnapshot: {
      data: Array<{
        sensorIndex: number;
        tagId: string;
        isAlarm: boolean;
      }>;
      lastSeen: string;
    };
    doorState: {
      door1: number | null; // 0=closed, 1=open
      door2: number | null; // null for single-door devices (V5008)
      lastSeen: string;
    };
  };
}

// Full Device Detail
interface DeviceDetail {
  deviceId: string;
  deviceType: string;
  isOnline: boolean;
  lastSeen: string;
  network: {
    ip: string;
    mac: string;
    mask: string;
    gwIp: string;
  };
  firmware: {
    version: string;
  };
  modules: Module[];
}

// Active Rack State (for the selected module)
interface RackState {
  deviceId: string;
  moduleIndex: number;
  isOnline: boolean;
  uTotal: number;
  deviceType: string;
  network: {
    ip: string;
    firmwareVersion: string;
  };
  // Sensor Arrays
  rfidSnapshot: Array<{ sensorIndex: number; tagId: string; isAlarm: boolean }>;
  tempHum: Array<{ sensorIndex: number; temp: number; hum: number }>;
  // Doors
  doorState: {
    door1: number | null;
    door2: number | null;
  };
}
```

### 5.2 Initialization (Pull)

1. **On Load:** Fetch Device List (`GET /api/v1/devices`).
2. **On Select:** Fetch full device details (`GET /api/v1/devices/:id`), then extract selected module.
3. **Loading:** Show Skeleton Loader while fetching.

### 5.3 Real-Time Updates (Push)

1. **Connection:** Connect to `ws://localhost:3001/ws`.
2. **Subscribe:** Send `{"type": "subscribe", "devices": [], "types": []}` to receive all messages.
3. **Store Action (`mergeUpdate`):**
   - **Filter:** Ignore messages not for the `activeRack` (check `deviceId` & `moduleIndex`).
   - **Merge:**
     - `TEMP_HUM` → Update `tempHum` array item with matching `sensorIndex`.
     - `RFID_SNAPSHOT` → Replace entire `rfidSnapshot` array.
     - `RFID_EVENT` → Add/Remove from `rfidSnapshot` array based on event.
     - `HEARTBEAT` → Set `isOnline: true` and update `lastSeenHb`.
     - `DOOR_STATE` → Update `doorState.door1` and `door2`.
   - **Device List:** If new device appears in message, refresh device list from API.

---

## 6. Control Features

- **Command API:** `POST /api/v1/commands`.
- **Actions:**
  - **Refresh RFID:** Sends `QUERY_RFID_SNAPSHOT` command.
  - **Clear Alarm:** Sends `CLEAR_ALARM` (Payload: `{ uIndex: number }`).
- **UX:** Optimistic UI is **NOT** required. Show "Command Sent" toast, wait for WebSocket to update the UI naturally.

---

## 7. Formatting Rules

- **Temperature:** 1 decimal place (`24.5°C`).
- **Humidity:** Integer (`50%`).
- **Noise:** Integer (`65dB`).
- **Empty Values:** Display as `-` if null/undefined.

---

## 8. Environment Configuration

Create `.env` file in `dashboardPro/` directory:

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_WS_URL=ws://localhost:3001/ws
```

Access in code via `import.meta.env.VITE_API_BASE_URL`.
