# Update dashboardPro for Middleware API Compatibility

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Update dashboardPro frontend to use middleware's existing `/api/v1/*` REST API instead of its custom `/api/live/*` endpoints

**Architecture:** Create adapter layer in dashboardPro that transforms middleware API responses to dashboardPro's expected format. Update all API calls, types, and store logic to align with middleware.

**Tech Stack:** React, TypeScript, Zustand, Axios

---

## Overview of Changes

dashboardPro currently expects:

- `GET /api/live/topology` → middleware has `GET /api/v1/devices`
- `GET /api/live/devices/:id/modules/:index` → middleware has `GET /api/v1/devices/:id` (returns all modules)
- `POST /api/commands` with `messageType` → middleware has `POST /api/v1/commands` with `command` field

We need to:

1. Update API endpoint URLs
2. Transform middleware responses to dashboardPro format
3. Update field names (messageType → command)
4. Extract specific module data from device detail response

---

### Task 1: Update API Endpoints Configuration

**Files:**

- Modify: `dashboardPro/.env.local`
- Modify: `dashboardPro/src/api/endpoints.ts`

**Step 1: Update environment variables**

Update `dashboardPro/.env.local`:

```
# API Configuration
VITE_API_URL=http://localhost:3000/api/v1

# WebSocket Configuration
VITE_WS_URL=ws://localhost:3001

# Application Configuration
VITE_APP_TITLE=IoT Ops Dashboard
VITE_APP_VERSION=1.2.0
```

**Step 2: Update API client base URL**

In `dashboardPro/src/api/endpoints.ts`, change base URL from `/api` to `/api/v1`:

```typescript
// Change from:
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// To:
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
```

**Step 3: Verify base URL change**

Check that all endpoints now use `/api/v1` prefix.

**Verification:**

- Open `dashboardPro/src/api/endpoints.ts`
- Confirm `API_BASE` ends with `/api/v1`

---

### Task 2: Update Topology Endpoint

**Files:**

- Modify: `dashboardPro/src/api/endpoints.ts` (getTopology function)
- Create: `dashboardPro/src/api/adapters.ts`

**Step 1: Create adapter file**

Create `dashboardPro/src/api/adapters.ts`:

```typescript
import type { DeviceMetadata } from '../types/schema';

/**
 * Transform middleware device list to dashboardPro topology format
 */
export function adaptDeviceListToTopology(middlewareResponse: any): DeviceMetadata[] {
  if (!middlewareResponse.success || !Array.isArray(middlewareResponse.data)) {
    return [];
  }

  return middlewareResponse.data.map((device: any) => ({
    deviceId: device.deviceId,
    deviceType: device.deviceType,
    ip: device.ip,
    mac: device.mac || null,
    isOnline: device.isOnline,
    activeModules: [], // Will be populated when fetching device detail
    fwVer: null, // Will be populated from device detail
    mask: null,
    gwIp: null,
  }));
}
```

**Step 2: Update getTopology function**

In `dashboardPro/src/api/endpoints.ts`, update getTopology:

```typescript
// Change from:
export const getTopology = async (): Promise<DeviceMetadata[]> => {
  const response = await apiClient.get<any[]>('/api/live/topology');
  return response.data.map((device: any) => ({
    deviceId: device.deviceId,
    deviceType: device.deviceType,
    ip: device.ip,
    isOnline: device.isOnline,
    activeModules: device.activeModules || [],
  }));
};

// To:
export const getTopology = async (): Promise<DeviceMetadata[]> => {
  const response = await apiClient.get<any>('/devices');
  return adaptDeviceListToTopology(response.data);
};
```

**Step 3: Import adapter**

Add import at top of `endpoints.ts`:

```typescript
import { adaptDeviceListToTopology } from './adapters';
```

**Verification:**

- File exists: `dashboardPro/src/api/adapters.ts`
- `getTopology` calls `/devices` (not `/api/live/topology`)
- Returns transformed data

---

### Task 3: Update Rack State Endpoint

**Files:**

- Modify: `dashboardPro/src/api/adapters.ts`
- Modify: `dashboardPro/src/api/endpoints.ts` (getRackState function)
- Modify: `dashboardPro/src/types/schema.ts`

**Step 1: Update RackState type to match middleware structure**

In `dashboardPro/src/types/schema.ts`, update RackState:

```typescript
// Add or update interface to handle middleware format
export interface RackState {
  deviceId: string;
  moduleIndex: number;
  isOnline: boolean;
  lastSeenHb?: string;
  rfidSnapshot?: Array<{
    sensorIndex: number;
    tagId: string;
    isAlarm: boolean;
  }>;
  tempHum?: Array<{
    sensorIndex: number;
    temp: number;
    hum: number;
  }>;
  noiseLevel?: Array<{
    sensorIndex: number;
    noise: number;
  }>;
  doorState?: number | null;
  door1State?: number | null;
  door2State?: number | null;
}
```

**Step 2: Add rack state adapter**

In `dashboardPro/src/api/adapters.ts`, add:

```typescript
import type { RackState } from '../types/schema';

/**
 * Transform middleware device detail to dashboardPro rack state format
 */
export function adaptDeviceDetailToRackState(
  deviceDetail: any,
  moduleIndex: number
): RackState | null {
  if (!deviceDetail.success || !deviceDetail.data) {
    return null;
  }

  const device = deviceDetail.data;
  const module = device.modules?.find((m: any) => m.moduleIndex === moduleIndex);

  if (!module) {
    return null;
  }

  return {
    deviceId: device.deviceId,
    moduleIndex: module.moduleIndex,
    isOnline: module.isOnline,
    lastSeenHb: module.lastSeenHb,
    rfidSnapshot: module.telemetry?.rfidSnapshot?.data || [],
    tempHum: module.telemetry?.tempHum?.data || [],
    noiseLevel: module.telemetry?.noiseLevel?.data || [],
    door1State: module.telemetry?.doorState?.door1 ?? null,
    door2State: module.telemetry?.doorState?.door2 ?? null,
  };
}
```

**Step 3: Update getRackState function**

In `dashboardPro/src/api/endpoints.ts`, update:

```typescript
// Change from:
export const getRackState = async (deviceId: string, moduleIndex: number): Promise<any> => {
  const response = await apiClient.get<any>(`/api/live/devices/${deviceId}/modules/${moduleIndex}`);
  return response.data;
};

// To:
export const getRackState = async (
  deviceId: string,
  moduleIndex: number
): Promise<RackState | null> => {
  const response = await apiClient.get<any>(`/devices/${deviceId}`);
  return adaptDeviceDetailToRackState(response.data, moduleIndex);
};
```

**Step 4: Import adapter and type**

Ensure imports at top of `endpoints.ts`:

```typescript
import { adaptDeviceListToTopology, adaptDeviceDetailToRackState } from './adapters';
import type { RackState } from '../types/schema';
```

**Verification:**

- `getRackState` calls `/devices/${deviceId}` (not `/api/live/devices/.../modules/...`)
- Returns specific module data extracted from device detail
- Handles case when module not found

---

### Task 4: Update Send Command Endpoint

**Files:**

- Modify: `dashboardPro/src/api/endpoints.ts` (sendCommand function)
- Modify: `dashboardPro/src/types/schema.ts`

**Step 1: Update CommandRequest type**

In `dashboardPro/src/types/schema.ts`, ensure CommandRequest uses `command` field:

```typescript
export interface CommandRequest {
  deviceId: string;
  deviceType: string;
  command: string; // Changed from messageType
  moduleIndex?: number;
  uIndex?: number;
  payload?: any;
}
```

**Step 2: Update sendCommand function**

In `dashboardPro/src/api/endpoints.ts`, update:

```typescript
// Change from:
export const sendCommand = async (command: CommandRequest): Promise<any> => {
  const response = await apiClient.post('/api/commands', {
    deviceId: command.deviceId,
    deviceType: command.deviceType,
    messageType: command.messageType, // Old field name
    payload: command.payload,
  });
  return response.data;
};

// To:
export const sendCommand = async (command: CommandRequest): Promise<any> => {
  const response = await apiClient.post('/commands', {
    deviceId: command.deviceId,
    deviceType: command.deviceType,
    command: command.command, // New field name
    moduleIndex: command.moduleIndex,
    uIndex: command.uIndex,
    // Include payload fields if needed
    ...(command.payload && { ...command.payload }),
  });
  return response.data;
};
```

**Step 3: Update all command callers**

Search for all usages of `sendCommand` and update field name from `messageType` to `command`:

Files to check:

- `dashboardPro/src/components/**/*.tsx`
- `dashboardPro/src/hooks/**/*.ts`

Example change:

```typescript
// Change from:
await sendCommand({
  deviceId: '123',
  deviceType: 'V5008',
  messageType: 'QUERY_RFID_SNAPSHOT',
  moduleIndex: 1,
});

// To:
await sendCommand({
  deviceId: '123',
  deviceType: 'V5008',
  command: 'QUERY_RFID_SNAPSHOT',
  moduleIndex: 1,
});
```

**Verification:**

- `sendCommand` posts to `/commands` (not `/api/commands`)
- Uses `command` field (not `messageType`)
- All callers updated to use `command` field

---

### Task 5: Update Store to Handle Transformed Data

**Files:**

- Modify: `dashboardPro/src/store/useIoTStore.ts`

**Step 1: Update setActiveSelection to handle module fetching**

In `dashboardPro/src/store/useIoTStore.ts`, ensure the store properly handles the new data format:

The store should already work since `getRackState` now returns the expected `RackState` format. However, we need to ensure the store properly populates `activeModules` when topology is loaded.

**Step 2: Update topology population**

In `dashboardPro/App.tsx` or wherever topology is loaded, we need to populate `activeModules`:

```typescript
// When loading topology, for each device, optionally fetch detail to get modules
// Or update adapter to include module count from middleware response
```

Actually, looking at the middleware response, it includes `moduleCount`. Let's update the adapter:

**Step 3: Update adapter to include module count**

In `dashboardPro/src/api/adapters.ts`, update `adaptDeviceListToTopology`:

```typescript
export function adaptDeviceListToTopology(middlewareResponse: any): DeviceMetadata[] {
  if (!middlewareResponse.success || !Array.isArray(middlewareResponse.data)) {
    return [];
  }

  return middlewareResponse.data.map((device: any) => ({
    deviceId: device.deviceId,
    deviceType: device.deviceType,
    ip: device.ip,
    mac: device.mac || null,
    isOnline: device.isOnline,
    // Create placeholder modules based on moduleCount
    activeModules: Array.from({ length: device.moduleCount || 0 }, (_, i) => ({
      moduleIndex: i + 1,
      moduleId: '', // Will be populated when fetching device detail
      uTotal: 0,
      fwVer: null,
    })),
    fwVer: null,
    mask: null,
    gwIp: null,
  }));
}
```

**Verification:**

- Device list shows modules
- Clicking module fetches correct data

---

### Task 6: Update WebSocket Handling

**Files:**

- Modify: `dashboardPro/src/hooks/useSocket.ts`
- Modify: `dashboardPro/src/store/useIoTStore.ts`

**Step 1: Verify WebSocket message format**

Middleware sends WebSocket messages in this format:

```json
{
  "type": "message",
  "data": {
    "suoType": "SUO_HEARTBEAT",
    "deviceId": "123",
    "moduleIndex": 1,
    ...
  }
}
```

Check if dashboardPro's `useSocket` handles this format or expects flat structure.

**Step 2: Update message handling if needed**

In `dashboardPro/src/hooks/useSocket.ts`, ensure it handles the middleware format:

```typescript
// If dashboardPro expects flat format, extract from data field
ws.onmessage = event => {
  const message = JSON.parse(event.data);

  // Handle middleware format: { type: "message", data: {...} }
  if (message.type === 'message' && message.data) {
    handleUpdate(message.data);
  } else {
    // Handle direct format
    handleUpdate(message);
  }
};
```

**Step 3: Update mergeUpdate for suoType field**

In `dashboardPro/src/store/useIoTStore.ts`, update `mergeUpdate` to use `suoType` instead of `messageType`:

```typescript
// Change from:
switch (message.messageType) {
  case 'HEARTBEAT': ...
}

// To:
switch (message.suoType) {
  case 'SUO_HEARTBEAT': ...
}
```

**Verification:**

- WebSocket connects successfully
- Real-time updates work
- Message format handled correctly

---

### Task 7: Update Health Check Endpoint

**Files:**

- Modify: `dashboardPro/src/api/endpoints.ts`

**Step 1: Update health check URL**

In `dashboardPro/src/api/endpoints.ts`:

```typescript
// Change from:
export const checkHealth = async (): Promise<boolean> => {
  try {
    await apiClient.get('/api/health');
    return true;
  } catch {
    return false;
  }
};

// To:
export const checkHealth = async (): Promise<boolean> => {
  try {
    await apiClient.get('/health'); // Root level health endpoint
    return true;
  } catch {
    return false;
  }
};
```

**Verification:**

- Health check calls `/health` (not `/api/health`)

---

### Task 8: Test Full Integration

**Files:**

- All modified files

**Step 1: Install dependencies**

```bash
cd dashboardPro
npm install
```

**Step 2: Start dashboard**

```bash
npm run dev
```

**Step 3: Verify all functionality**

Check in browser at http://localhost:5173:

1. ✅ Device list loads (shows devices from middleware)
2. ✅ Clicking device shows modules
3. ✅ Clicking module loads rack data
4. ✅ Temperature/humidity sensors display
5. ✅ RFID tags display
6. ✅ Door status displays
7. ✅ Send command works (e.g., refresh RFID)
8. ✅ Real-time updates via WebSocket
9. ✅ No console errors

**Step 4: Check browser DevTools**

- Network tab: All API calls return 200
- Console: No errors
- WebSocket: Connected and receiving messages

**Verification:**

- Dashboard loads without errors
- All features functional
- API calls use correct endpoints

---

## Summary of Changes

### Files Created:

1. `dashboardPro/src/api/adapters.ts` - Response transformation layer

### Files Modified:

1. `dashboardPro/.env.local` - Update API base URL
2. `dashboardPro/src/api/endpoints.ts` - Update all endpoint URLs and field names
3. `dashboardPro/src/types/schema.ts` - Align types with middleware
4. `dashboardPro/src/store/useIoTStore.ts` - Update field names (messageType → suoType)
5. `dashboardPro/src/hooks/useSocket.ts` - Handle middleware message format

### API Mapping:

| dashboardPro (Old)                     | Middleware (New)      | Status     |
| -------------------------------------- | --------------------- | ---------- |
| `/api/live/topology`                   | `/api/v1/devices`     | ✅ Updated |
| `/api/live/devices/:id/modules/:index` | `/api/v1/devices/:id` | ✅ Updated |
| `/api/commands`                        | `/api/v1/commands`    | ✅ Updated |
| `/api/health`                          | `/health`             | ✅ Updated |
| Field: `messageType`                   | Field: `command`      | ✅ Updated |
| Field: `messageType` (WS)              | Field: `suoType`      | ✅ Updated |

---

## Rollback Plan

If issues arise:

1. Revert changes in git: `git checkout -- dashboardPro/`
2. Restore original `.env.local`
3. Restart dashboard

---

## Notes

- All changes are in dashboardPro only - middleware remains unchanged
- Adapter pattern allows future API changes without touching components
- Type safety maintained throughout with TypeScript
