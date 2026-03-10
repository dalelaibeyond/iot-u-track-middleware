# MQTT Middleware Pro - API Documentation

**Version**: 1.0  
**Date**: 2026-03-04

## Overview

The MQTT Middleware Pro provides REST API and WebSocket endpoints for querying device state, sending commands, and receiving real-time updates.

**REST Base URL**: `http://localhost:3000/api/v1`  
**WebSocket URL**: `ws://localhost:3001/ws`  
**Health Check**: `http://localhost:3000/health`

**Base URL**: `http://localhost:3000/api/v1`  
**Health Check**: `http://localhost:3000/health`

## Configuration

API settings are controlled via environment variables:

```bash
# Enable/disable API
API_ENABLED=true

# Server settings
API_PORT=3000
API_HOST=0.0.0.0

# CORS settings
API_ENABLE_CORS=true
API_CORS_ORIGINS=*

# API prefix
API_PREFIX=/api/v1
```

## Endpoints

### Health Check

#### GET /health

Check the health status of the middleware and its dependencies.

**Response**:

```json
{
  "success": true,
  "timestamp": "2026-03-02T10:30:00.000Z",
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 3600,
  "services": {
    "mqtt": {
      "connected": true,
      "broker": "mqtt://localhost:1883",
      "reconnectCount": 0
    },
    "cache": {
      "enabled": true,
      "size": 10,
      "maxSize": 10000,
      "hitRate": 95.5
    },
    "database": {
      "connected": true
    },
    "application": {
      "running": true
    }
  }
}
```

### Devices

#### GET /api/v1/devices

List all devices currently in the cache.

**Response**:

```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "deviceId": "2437871205",
      "deviceType": "V5008",
      "isOnline": true,
      "moduleCount": 2,
      "lastSeen": "2026-03-02T10:25:00.000Z",
      "ip": "192.168.1.100",
      "mac": "00:11:22:33:44:55"
    }
  ]
}
```

#### GET /api/v1/devices/:id

Get detailed information about a specific device.

**Parameters**:

- `id` (path): Device ID

**Response**:

```json
{
  "success": true,
  "data": {
    "deviceId": "2437871205",
    "deviceType": "V5008",
    "isOnline": true,
    "lastSeen": "2026-03-02T10:25:00.000Z",
    "network": {
      "ip": "192.168.1.100",
      "mac": "00:11:22:33:44:55",
      "mask": "255.255.255.0",
      "gwIp": "192.168.1.1"
    },
    "firmware": {
      "version": "1.2.3"
    },
    "modules": [
      {
        "moduleIndex": 1,
        "moduleId": "module-001",
        "uTotal": 8,
        "isOnline": true,
        "lastSeenHb": "2026-03-02T10:25:00.000Z",
        "telemetry": {
          "tempHum": {
            "data": [{ "sensorIndex": 1, "temp": 25.5, "hum": 60 }],
            "lastSeen": "2026-03-02T10:20:00.000Z"
          },
          "rfidSnapshot": {
            "data": [{ "sensorIndex": 1, "tagId": "E200123456", "isAlarm": false }],
            "lastSeen": "2026-03-02T10:25:00.000Z"
          },
          "doorState": {
            "door1": 0,
            "door2": null,
            "lastSeen": "2026-03-02T10:25:00.000Z"
          }
        }
      }
    ]
  }
}
```

#### GET /api/v1/devices/:id/modules

Get all modules for a specific device.

**Parameters**:

- `id` (path): Device ID

**Response**:

```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "deviceId": "2437871205",
      "deviceType": "V5008",
      "moduleIndex": 1,
      "moduleId": "module-001",
      "uTotal": 8,
      "isOnline": true,
      "telemetry": { ... }
    }
  ]
}
```

#### GET /api/v1/devices/:id/history

Query historical data for a device from the database.

**Parameters**:

- `id` (path): Device ID
- `type` (query, required): SUO message type. One of:
  - `SUO_DEV_MOD`
  - `SUO_HEARTBEAT`
  - `SUO_RFID_SNAPSHOT`
  - `SUO_RFID_EVENT`
  - `SUO_TEMP_HUM`
  - `SUO_NOISE_LEVEL`
  - `SUO_DOOR_STATE`
  - `SUO_COMMAND_RESULT`
- `moduleIndex` (query, optional): Filter by module index
- `limit` (query, optional): Maximum records to return (1-1000, default: 100)
- `startDate` (query, optional): Start date filter (ISO8601)
- `endDate` (query, optional): End date filter (ISO8601)

**Example**: `/api/v1/devices/2437871205/history?type=SUO_HEARTBEAT&limit=50`

**Response**:

```json
{
  "success": true,
  "count": 50,
  "query": {
    "deviceId": "2437871205",
    "type": "SUO_HEARTBEAT",
    "limit": 50
  },
  "data": [
    {
      "id": 1,
      "device_id": "2437871205",
      "device_type": "V5008",
      "server_timestamp": "2026-03-02T10:25:00.000Z",
      "modules_json": "[{\"moduleIndex\":1,...}]"
    }
  ]
}
```

### Commands

#### GET /api/v1/commands

List all pending commands.

**Response**:

```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "commandId": "cmd-1234567890-abc123",
      "deviceId": "2437871205",
      "deviceType": "V5008",
      "command": "QUERY_TEMP_HUM",
      "status": "pending",
      "sentAt": null,
      "retryCount": 0
    }
  ]
}
```

#### GET /api/v1/commands/:id

Get the status of a specific command.

**Parameters**:

- `id` (path): Command ID

**Response**:

```json
{
  "success": true,
  "data": {
    "commandId": "cmd-1234567890-abc123",
    "deviceId": "2437871205",
    "deviceType": "V5008",
    "command": "QUERY_TEMP_HUM",
    "status": "completed",
    "sentAt": "2026-03-02T10:25:00.000Z",
    "completedAt": "2026-03-02T10:25:05.000Z",
    "result": "Success",
    "retryCount": 0
  }
}
```

#### POST /api/v1/commands

Send a command to a device.

**Request Body**:

```json
{
  "deviceId": "2437871205",
  "deviceType": "V5008",
  "command": "QUERY_TEMP_HUM",
  "moduleIndex": 1
}
```

**Valid Commands**:

- `QUERY_DEVICE_INFO` - Query device information
- `QUERY_MODULE_INFO` - Query module information
- `QUERY_RFID_SNAPSHOT` - Query RFID snapshot (requires `moduleIndex`)
- `QUERY_DOOR_STATE` - Query door state (requires `moduleIndex`)
- `QUERY_TEMP_HUM` - Query temperature and humidity (requires `moduleIndex`)
- `SET_COLOR` - Set LED colors (requires `moduleIndex` and `sensors`)
- `CLEAR_ALARM` - Clear alarm (requires `moduleIndex` and `uIndex`)

**SET_COLOR Example**:

```json
{
  "deviceId": "2437871205",
  "deviceType": "V5008",
  "command": "SET_COLOR",
  "moduleIndex": 1,
  "sensors": [
    { "uIndex": 1, "colorCode": 1 },
    { "uIndex": 2, "colorCode": 2 }
  ]
}
```

**CLEAR_ALARM Example**:

```json
{
  "deviceId": "2437871205",
  "deviceType": "V5008",
  "command": "CLEAR_ALARM",
  "moduleIndex": 1,
  "uIndex": 2
}
```

**Response**:

```json
{
  "success": true,
  "message": "Command accepted",
  "data": {
    "commandId": "cmd-1234567890-abc123",
    "deviceId": "2437871205",
    "command": "QUERY_TEMP_HUM",
    "status": "pending",
    "timestamp": "2026-03-02T10:25:00.000Z"
  }
}
```

### Statistics

#### GET /api/v1/stats

Get overall system statistics.

**Response**:

```json
{
  "success": true,
  "timestamp": "2026-03-02T10:30:00.000Z",
  "data": {
    "system": {
      "application": {
        "running": true,
        "uptime": 3600,
        "uptimeFormatted": "1h 0m 0s"
      },
      "node": {
        "version": "v22.21.0",
        "platform": "win32"
      },
      "memory": {
        "used": { "bytes": 52428800, "mb": 50 },
        "rss": { "bytes": 104857600, "mb": 100 }
      }
    },
    "cache": {
      "entries": { "total": 10, "max": 10000, "utilization": 0.1 },
      "performance": { "hits": 100, "misses": 10, "hitRate": 90.91 },
      "devices": { "count": 2, "totalModules": 5 }
    },
    "mqtt": {
      "connected": true,
      "broker": { "url": "mqtt://localhost:1883" },
      "messages": { "received": 1000, "published": 50 }
    },
    "database": {
      "connected": true,
      "writer": { "enabled": true }
    }
  }
}
```

#### GET /api/v1/stats/cache

Get cache-specific statistics.

#### GET /api/v1/stats/mqtt

Get MQTT-specific statistics.

#### GET /api/v1/stats/database

Get database-specific statistics.

## WebSocket

Real-time device updates via WebSocket.

**URL**: `ws://localhost:3001/ws`

### Connection

Connect to the WebSocket endpoint to receive real-time device updates.

### Subscription Message

After connecting, send a subscription message to receive updates:

```json
{
  "type": "subscribe",
  "devices": ["2437871205"],
  "types": ["SUO_RFID_SNAPSHOT", "SUO_TEMP_HUM", "SUO_DOOR_STATE"]
}
```

**Parameters**:

- `devices` (array): Device IDs to subscribe to. Empty array `[]` means all devices.
- `types` (array): SUO message types to subscribe to. Empty array `[]` means all types.

### Message Format

Incoming messages follow the SUO format:

```json
{
  "suoType": "SUO_RFID_SNAPSHOT",
  "deviceId": "2437871205",
  "deviceType": "V5008",
  "moduleIndex": 1,
  "moduleId": "module-001",
  "serverTimestamp": "2026-03-02T10:30:00.000Z",
  "data": {
    "sensors": [{ "sensorIndex": 1, "tagId": "E200123456", "isAlarm": false }]
  }
}
```

### JavaScript Example

```javascript
const ws = new WebSocket('ws://localhost:3001/ws');

ws.onopen = () => {
  ws.send(
    JSON.stringify({
      type: 'subscribe',
      devices: [],
      types: [],
    })
  );
};

ws.onmessage = event => {
  const message = JSON.parse(event.data);
  console.log('Received:', message.suoType, message);
};
```

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {} // Optional additional details
}
```

**Common Error Codes**:

- `NOT_FOUND` - Resource not found (404)
- `BAD_REQUEST` - Invalid request (400)
- `VALIDATION_ERROR` - Validation failed (422)
- `INTERNAL_ERROR` - Server error (500)

## Example Usage

### Using curl

```bash
# Health check
curl http://localhost:3000/health

# List devices
curl http://localhost:3000/api/v1/devices

# Get device details
curl http://localhost:3000/api/v1/devices/2437871205

# Get device modules
curl http://localhost:3000/api/v1/devices/2437871205/modules

# Query device history
curl "http://localhost:3000/api/v1/devices/2437871205/history?type=SUO_HEARTBEAT&limit=10"

# Send a command
curl -X POST http://localhost:3000/api/v1/commands \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "2437871205",
    "deviceType": "V5008",
    "command": "QUERY_TEMP_HUM",
    "moduleIndex": 1
  }'

# Check command status
curl http://localhost:3000/api/v1/commands/cmd-1234567890-abc123

# Get system stats
curl http://localhost:3000/api/v1/stats
```

### Using JavaScript/TypeScript

```typescript
// List devices
const devices = await fetch('http://localhost:3000/api/v1/devices').then(r => r.json());

// Send command
const result = await fetch('http://localhost:3000/api/v1/commands', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    deviceId: '2437871205',
    deviceType: 'V5008',
    command: 'QUERY_TEMP_HUM',
    moduleIndex: 1,
  }),
}).then(r => r.json());
```
