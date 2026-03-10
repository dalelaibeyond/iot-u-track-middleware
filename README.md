# MQTT Middleware Pro

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-ISC-green)](LICENSE)

> High-throughput IoT gateway data integration and normalization middleware for V5008 and V6800 devices.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Configuration](#configuration)
- [API Documentation](#api-documentation)
- [WebSocket Usage](#websocket-usage)
- [Development](#development)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## 🔭 Overview

MQTT Middleware Pro is a production-ready integration layer that unifies data from heterogeneous IoT gateway devices into a standardized format. It processes data through a four-stage transformation pipeline:

```
RAW (Device-specific) → SIF (Standard Intermediate Format) → SUO (Standard Unified Object) → UOS (Cache) + DB (MySQL)
```

**Supported Device Types:**

| Device | Protocol | Format | Use Case                 |
| ------ | -------- | ------ | ------------------------ |
| V5008  | MQTT     | Binary | Industrial RFID gateways |
| V6800  | MQTT     | JSON   | Smart shelf systems      |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MQTT Middleware Pro                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                │
│  │   V5008      │     │   V6800      │     │   Other      │                │
│  │  Devices     │     │  Devices     │     │  Devices     │                │
│  └──────┬───────┘     └──────┬───────┘     └──────┬───────┘                │
│         │                    │                    │                         │
│         └────────────────────┼────────────────────┘                         │
│                              │ MQTT                                          │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      MQTT Broker (EMQX)                             │   │
│  └─────────────────────────────┬───────────────────────────────────────┘   │
│                                │                                            │
│  ┌─────────────────────────────▼───────────────────────────────────────┐   │
│  │                      MQTT Subscriber                                │   │
│  │                   (Subscribes to V5008Upload/+, V6800Upload/+)     │   │
│  └─────────────────────────────┬───────────────────────────────────────┘   │
│                                │ RAW_MQTT_MESSAGE                          │
│                                ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Event Bus                                   │   │
│  │              (Routes messages to appropriate handlers)              │   │
│  └──────┬──────────┬──────────┬──────────┬──────────────────────────────┘   │
│         │          │          │          │                                   │
│         ▼          ▼          ▼          ▼                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐                   │
│  │  Parser  │ │ SmartHB  │ │ Watchdog │ │   Output     │                   │
│  │ (V5008/  │ │ (Auto-   │ │(Scheduled│ │   Modules    │                   │
│  │  V6800)  │ │  query)  │ │  tasks)  │ │              │                   │
│  └────┬─────┘ └──────────┘ └──────────┘ └──────┬───────┘                   │
│       │ SIF_MESSAGE                              │                          │
│       ▼                                          │                          │
│  ┌────────────┐                                  │                          │
│  │ Normalizer │                                  │                          │
│  │(SIF→SUO)   │                                  │                          │
│  └────┬───────┘                                  │                          │
│       │ SUO_MQTT_MESSAGE                         │                          │
│       ▼                                          ▼                          │
│  ┌────────────┐     ┌────────────┐     ┌────────────────┐                  │
│  │ UOS Cache  │────▶│  Database  │     │ MQTT Relay     │ → Downstream    │
│  │ (In-Mem)   │     │  (MySQL)   │     │ WebSocket      │ → UI Clients    │
│  └────────────┘     └────────────┘     │ Webhook        │ → HTTP APIs     │
│                                        └────────────────┘                  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         REST API                                    │   │
│  │    (HTTP endpoints for queries, commands, and monitoring)          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## ✨ Features

### Core Processing

- ✅ **Dual Protocol Support**: V5008 (binary) + V6800 (JSON)
- ✅ **21 Message Types**: HEARTBEAT, RFID_SNAPSHOT, TEMP_HUM, DOOR_STATE, etc.
- ✅ **Automatic Device Detection**: Identifies device type from MQTT topic
- ✅ **Message Normalization**: Converts device-specific formats to unified SUO format
- ✅ **Multi-Module Flattening**: Handles V6800 multi-module messages

### Data Persistence

- ✅ **UOS Cache**: In-memory state with LRU eviction and TTL expiration
- ✅ **MySQL Database**: Full SUO history with 8 tables
- ✅ **Batch Writing**: Efficient database writes with backpressure handling

### Smart Features

- ✅ **Smart Heartbeat**: Auto-queries device/module info on heartbeat
- ✅ **Device Info Repair**: Builds complete device metadata from partial updates (V5008)
- ✅ **Protocol Adapter**: Unifies V5008/V6800 behaviors (RFID event normalization)
- ✅ **Watchdog**: Scheduled health checks and cache maintenance
- ✅ **Command Service**: Send commands to devices with retry logic

### Distribution & Integration

- ✅ **REST API**: 12 HTTP endpoints for queries and control
- ✅ **Dashboard**: Web UI for real-time device monitoring
- ✅ **MQTT Relay**: Forward SUO messages to downstream brokers
- ✅ **WebSocket Server**: Real-time updates for UI clients
- ✅ **Webhook Dispatcher**: POST to HTTP endpoints with retry/batching

### Operations

- ✅ **Graceful Shutdown**: Clean resource cleanup
- ✅ **Health Checks**: `/health` endpoint for monitoring
- ✅ **Structured Logging**: JSON logs with context
- ✅ **Docker Support**: Multi-stage Dockerfile + docker-compose

## 🚀 Quick Start

### Using Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/yourusername/mqtt-middleware-pro.git
cd mqtt-middleware-pro

# Start all services (MQTT broker, MySQL, and the app)
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f app

# Test health endpoint
curl http://localhost:3000/health
```

### Services will be available at:

| Service        | URL                           | Description                  |
| -------------- | ----------------------------- | ---------------------------- |
| Monitor        | http://localhost:3000/monitor | Lightweight monitoring UI    |
| REST API       | http://localhost:3000/api/v1  | HTTP API endpoints           |
| Health Check   | http://localhost:3000/health  | Service health status        |
| WebSocket      | ws://localhost:3001/ws        | Real-time updates            |
| MQTT Broker    | mqtt://localhost:1883         | EMQX MQTT broker             |
| EMQX Dashboard | http://localhost:18083        | MQTT broker UI (admin/admin) |
| MySQL          | localhost:3306                | Database                     |

## 📦 Installation

### Prerequisites

- Node.js 18+
- MySQL 8.0 (optional, for persistence)
- MQTT Broker (optional, EMQX recommended)

### Local Development

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env

# Run database migrations (if using MySQL)
npm run db:migrate

# Or manually
node scripts/migrate.js

# Clean/reset database (DANGER: deletes all data!)
npm run db:clean

# Clean without confirmation (for CI/CD)
npm run db:clean -- --force

# Start development server with hot reload
npm run dev

# Or build and run production
npm run build
npm start
```

### Environment Setup

Create a `.env` file:

```bash
# Required
MQTT_BROKER_URL=mqtt://localhost:1883

# Optional - API Server
API_ENABLED=true
API_PORT=3000
API_HOST=0.0.0.0

# Optional - Database
DB_ENABLED=true
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=yourpassword
DB_NAME=mqtt_middleware

# Optional - Output Modules
OUTPUT_MQTT_RELAY_ENABLED=false
OUTPUT_WEBSOCKET_ENABLED=true
OUTPUT_WEBSOCKET_PORT=3001
OUTPUT_WEBHOOK_ENABLED=false

# Optional - Modules
MODULE_SMART_HB_ENABLED=true
MODULE_PROTOCOL_ADAPTER_ENABLED=true
MODULE_WATCHDOG_ENABLED=true
```

## ⚙️ Configuration

### Core Settings

| Variable          | Default                 | Description                              |
| ----------------- | ----------------------- | ---------------------------------------- |
| `NODE_ENV`        | `development`           | Environment mode                         |
| `LOG_LEVEL`       | `info`                  | Logging level (error, warn, info, debug) |
| `LOG_FORMAT`      | `json`                  | Logging format (json, text)              |
| `LOG_OUTPUT`      | `console`               | Logging output (console, file)           |
| `MQTT_BROKER_URL` | `mqtt://localhost:1883` | MQTT broker connection URL               |
| `MQTT_CLIENT_ID`  | Auto-generated          | MQTT client identifier                   |

### MQTT Topic Configuration

| Variable                    | Default             | Description                               |
| --------------------------- | ------------------- | ----------------------------------------- |
| `MQTT_TOPIC_V5008_UPLOAD`   | `V5008Upload/+/+`   | Subscribe to V5008 device upload messages |
| `MQTT_TOPIC_V6800_UPLOAD`   | `V6800Upload/+/+`   | Subscribe to V6800 device upload messages |
| `MQTT_TOPIC_V5008_DOWNLOAD` | `V5008Download/+/+` | Publish commands to V5008 devices         |
| `MQTT_TOPIC_V6800_DOWNLOAD` | `V6800Download/+/+` | Publish commands to V6800 devices         |

**Topic Wildcards:**

- `+` matches any single level (e.g., device ID)
- `#` matches any remaining levels

**Default subscriptions:**

- `V5008Upload/+/+` - Receives all V5008 device messages (HEARTBEAT, RFID_SNAPSHOT, etc.)
- `V6800Upload/+/+` - Receives all V6800 device messages (HeartBeat, LabelState, etc.)

### MQTT Broker Connection Settings

| Variable                | Default     | Description                     |
| ----------------------- | ----------- | ------------------------------- |
| `MQTT_BROKER_HOST`      | `localhost` | MQTT broker host                |
| `MQTT_BROKER_PORT`      | `1883`      | MQTT broker port                |
| `MQTT_BROKER_PROTOCOL`  | `mqtt`      | Protocol (mqtt, mqtts, ws, wss) |
| `MQTT_BROKER_USERNAME`  | -           | MQTT broker username            |
| `MQTT_BROKER_PASSWORD`  | -           | MQTT broker password            |
| `MQTT_RECONNECT_PERIOD` | `5000`      | Reconnect period in ms          |
| `MQTT_CONNECT_TIMEOUT`  | `30000`     | Connection timeout in ms        |
| `MQTT_KEEPALIVE`        | `60`        | Keepalive interval in seconds   |
| `MQTT_CLEAN`            | `false`     | Clean session flag              |

### Cache Configuration

| Variable               | Default | Description                          |
| ---------------------- | ------- | ------------------------------------ |
| `ENABLE_CACHE`         | `true`  | Enable UOS in-memory cache           |
| `CACHE_MAX_SIZE`       | `10000` | Maximum cache entries                |
| `CACHE_DEFAULT_TTL`    | `300`   | Default TTL in seconds               |
| `CACHE_MAX_QUEUE_SIZE` | `1000`  | Max queued operations (backpressure) |

### API Configuration

| Variable           | Default   | Description            |
| ------------------ | --------- | ---------------------- |
| `API_ENABLED`      | `true`    | Enable REST API server |
| `API_PORT`         | `3000`    | HTTP server port       |
| `API_HOST`         | `0.0.0.0` | HTTP server host       |
| `API_ENABLE_CORS`  | `true`    | Enable CORS headers    |
| `API_CORS_ORIGINS` | `*`       | Allowed CORS origins   |
| `API_PREFIX`       | `/api/v1` | API route prefix       |

### Database Configuration

| Variable              | Default           | Description                   |
| --------------------- | ----------------- | ----------------------------- |
| `DB_ENABLED`          | `false`           | Enable MySQL database         |
| `DB_HOST`             | `localhost`       | MySQL host                    |
| `DB_PORT`             | `3306`            | MySQL port                    |
| `DB_USERNAME`         | `root`            | MySQL username                |
| `DB_PASSWORD`         | -                 | MySQL password                |
| `DB_NAME`             | `mqtt_middleware` | Database name                 |
| `DB_CONNECTION_LIMIT` | `10`              | Database connection pool size |

### Database Writer Configuration

| Variable                  | Default | Description                      |
| ------------------------- | ------- | -------------------------------- |
| `DB_WRITER_ENABLED`       | `true`  | Enable database writer module    |
| `DB_WRITER_BATCH_SIZE`    | `100`   | Records per batch insert         |
| `DB_WRITER_MAX_QUEUE`     | `1000`  | Max queued writes (backpressure) |
| `DB_WRITER_RETRY_COUNT`   | `3`     | Retry failed writes              |
| `DB_WRITER_QUEUE_TIMEOUT` | `5000`  | Max queue wait time (ms)         |

### MQTT Relay Configuration

| Variable                         | Default                 | Description           |
| -------------------------------- | ----------------------- | --------------------- |
| `OUTPUT_MQTT_RELAY_ENABLED`      | `false`                 | Enable MQTT relay     |
| `OUTPUT_MQTT_RELAY_URL`          | `mqtt://localhost:1884` | Downstream broker URL |
| `OUTPUT_MQTT_RELAY_QOS`          | `1`                     | QoS level (0, 1, 2)   |
| `OUTPUT_MQTT_RELAY_RETAIN`       | `false`                 | Retain messages       |
| `OUTPUT_MQTT_RELAY_TOPIC_PREFIX` | `middleware`            | Topic prefix          |

### WebSocket Configuration

| Variable                       | Default | Description             |
| ------------------------------ | ------- | ----------------------- |
| `OUTPUT_WEBSOCKET_ENABLED`     | `false` | Enable WebSocket server |
| `OUTPUT_WEBSOCKET_PORT`        | `3001`  | WebSocket port          |
| `OUTPUT_WEBSOCKET_PATH`        | `/ws`   | WebSocket endpoint path |
| `OUTPUT_WEBSOCKET_MAX_CLIENTS` | `100`   | Max concurrent clients  |

### Webhook Configuration

| Variable                        | Default | Description                    |
| ------------------------------- | ------- | ------------------------------ |
| `OUTPUT_WEBHOOK_ENABLED`        | `false` | Enable webhook dispatcher      |
| `OUTPUT_WEBHOOK_ENDPOINTS`      | `[]`    | JSON array of endpoint configs |
| `OUTPUT_WEBHOOK_MAX_RETRIES`    | `3`     | Max retry attempts             |
| `OUTPUT_WEBHOOK_RETRY_DELAY`    | `1000`  | Retry delay in ms              |
| `OUTPUT_WEBHOOK_TIMEOUT`        | `10000` | Request timeout in ms          |
| `OUTPUT_WEBHOOK_MAX_CONCURRENT` | `10`    | Max concurrent requests        |

### Protocol Adapter Configuration

| Variable                               | Default | Description                    |
| -------------------------------------- | ------- | ------------------------------ |
| `MODULE_PROTOCOL_ADAPTER_ENABLED`      | `true`  | Enable protocol adapter module |
| `MODULE_PROTOCOL_ADAPTER_DEDUP_WINDOW` | `1000`  | Deduplication window in ms     |

### Watchdog Configuration

| Variable                         | Default | Description                      |
| -------------------------------- | ------- | -------------------------------- |
| `MODULE_WATCHDOG_ENABLED`        | `true`  | Enable watchdog module           |
| `WATCHDOG_HEALTH_CHECK_INTERVAL` | `60`    | Health check interval in seconds |

### Smart Heartbeat Configuration

| Variable                               | Default  | Description                   |
| -------------------------------------- | -------- | ----------------------------- |
| `MODULE_SMART_HB_ENABLED`              | `true`   | Enable smart heartbeat module |
| `MODULE_SMART_HB_QUERY_COOLDOWN`       | `300000` | Query cooldown in ms (5 min)  |
| `MODULE_SMART_HB_TRIGGER_ON_HEARTBEAT` | `true`   | Trigger on heartbeat receipt  |

### API Authentication Configuration

| Variable           | Default | Description                       |
| ------------------ | ------- | --------------------------------- |
| `API_JWT_SECRET`   | -       | JWT secret key for authentication |
| `API_TOKEN_EXPIRY` | `24h`   | JWT token expiration time         |

### Logging File Output Configuration

| Variable             | Default | Description                     |
| -------------------- | ------- | ------------------------------- |
| `LOG_FILE_PATH`      | -       | Path to log file                |
| `LOG_FILE_MAX_SIZE`  | `100M`  | Max log file size               |
| `LOG_FILE_MAX_FILES` | `10`    | Max number of log files to keep |

See `.env.example` for complete configuration options.

## 🔧 Module Configuration Guide

Modules are optional components that extend the middleware's functionality. Enable only the modules you need to optimize resource usage.

### Module Overview

| Module               | When to Enable                | Default | Purpose                                                          |
| -------------------- | ----------------------------- | ------- | ---------------------------------------------------------------- |
| **Smart Heartbeat**  | Always for V5008 devices      | `true`  | Auto-queries device info on heartbeat to build complete metadata |
| **Watchdog**         | Production environments       | `true`  | Scheduled health checks and cache maintenance                    |
| **MQTT Relay**       | Multi-broker architectures    | `false` | Forwards SUO messages to downstream MQTT brokers                 |
| **WebSocket**        | Real-time dashboard/UE        | `true`  | Provides live updates to web/mobile clients                      |
| **Webhook**          | Integration with HTTP APIs    | `false` | POSTs data to external HTTP endpoints                            |
| **Protocol Adapter** | Mixed V5008/V6800 deployments | `true`  | Normalizes behaviors between device types                        |

### Recommended Configurations

#### Minimal (Testing Only)

```bash
# Core processing only
MODULE_SMART_HB_ENABLED=false
MODULE_WATCHDOG_ENABLED=false
MODULE_MQTT_RELAY_ENABLED=false
MODULE_WEBSOCKET_ENABLED=false
MODULE_WEBHOOK_ENABLED=false
MODULE_PROTOCOL_ADAPTER_ENABLED=false

# Enable database if needed
DB_ENABLED=true
```

#### Standard (Typical Deployment)

```bash
# Enable core modules
MODULE_SMART_HB_ENABLED=true
MODULE_WATCHDOG_ENABLED=true
MODULE_WEBSOCKET_ENABLED=true
MODULE_PROTOCOL_ADAPTER_ENABLED=true

# Disable unused outputs
MODULE_MQTT_RELAY_ENABLED=false
MODULE_WEBHOOK_ENABLED=false

# Enable persistence
DB_ENABLED=true
ENABLE_CACHE=true
```

#### Full Stack (All Features)

```bash
# Enable all modules for testing
MODULE_SMART_HB_ENABLED=true
MODULE_WATCHDOG_ENABLED=true
MODULE_MQTT_RELAY_ENABLED=true
MODULE_WEBSOCKET_ENABLED=true
MODULE_WEBHOOK_ENABLED=true
MODULE_PROTOCOL_ADAPTER_ENABLED=true

# Enable all outputs
OUTPUT_MQTT_RELAY_ENABLED=true
OUTPUT_WEBSOCKET_ENABLED=true
OUTPUT_WEBHOOK_ENABLED=true

# Enable all core features
DB_ENABLED=true
DB_WRITER_ENABLED=true
ENABLE_CACHE=true
```

### Module Details

#### Smart Heartbeat

**Purpose**: Automatically queries device/module information when a heartbeat is received, building complete metadata without manual configuration.

**How it works**:

- Listens for `HEARTBEAT` messages from devices
- Queries device metadata if cooldown period has elapsed (default: 5 minutes)
- Populates `activeModules` array with module IDs and firmware versions

**When to use**: Always enable for V5008 devices. Optional for V6800.

**Configuration**:

```bash
MODULE_SMART_HB_QUERY_COOLDOWN=300000  # 5 minutes between queries
MODULE_SMART_HB_TRIGGER_ON_HEARTBEAT=true  # Trigger on heartbeat receipt
```

#### Watchdog

**Purpose**: Performs scheduled maintenance tasks and health checks to ensure system stability.

**Tasks**:

- Cleans expired cache entries
- Monitors module health status
- Generates system statistics
- Performs garbage collection

**When to use**: Enable in production for automatic maintenance.

**Configuration**:

```bash
WATCHDOG_HEALTH_CHECK_INTERVAL=60  # Check every 60 seconds
```

#### MQTT Relay

**Purpose**: Forwards normalized SUO messages to a downstream MQTT broker for multi-hop architectures.

**Use cases**:

- Regional broker hierarchy
- Cloud aggregation
- Separate operational and analytics brokers

**Configuration**:

```bash
OUTPUT_MQTT_RELAY_ENABLED=true
OUTPUT_MQTT_RELAY_URL=mqtt://downstream-broker:1883
OUTPUT_MQTT_RELAY_TOPIC_PREFIX=middleware  # Prefix for forwarded topics
OUTPUT_MQTT_RELAY_QOS=1  # Quality of Service (0, 1, 2)
```

#### WebSocket Output

**Purpose**: Provides real-time SUO message streaming to web dashboard and mobile clients.

**Features**:

- Bidirectional communication
- Automatic reconnection
- Subscribe/unsubscribe to specific devices
- Heartbeat keepalive

**When to use**: Required for the built-in dashboard. Enable for any real-time UI.

**Configuration**:

```bash
OUTPUT_WEBSOCKET_ENABLED=true
OUTPUT_WEBSOCKET_PORT=3001
OUTPUT_WEBSOCKET_MAX_CLIENTS=100
OUTPUT_WEBSOCKET_HEARTBEAT=30000  # 30 second heartbeat
```

#### Webhook Dispatcher

**Purpose**: POSTs SUO messages to external HTTP endpoints for integration with third-party systems.

**Features**:

- Configurable endpoints
- Retry logic with exponential backoff
- Batch sending
- Dead letter queue for failed messages

**Use cases**:

- Integration with cloud platforms (AWS, Azure, GCP)
- Custom analytics pipelines
- ERP system integration

**Configuration**:

```bash
OUTPUT_WEBHOOK_ENABLED=true
OUTPUT_WEBHOOK_ENDPOINTS=[
  {"id":"analytics","url":"https://api.example.com/webhook","enabled":true}
]
OUTPUT_WEBHOOK_MAX_RETRIES=3
OUTPUT_WEBHOOK_RETRY_DELAY=1000
OUTPUT_WEBHOOK_TIMEOUT=10000
OUTPUT_WEBHOOK_MAX_CONCURRENT=10
```

#### Protocol Adapter

**Purpose**: Normalizes behavioral differences between V5008 and V6800 devices, providing consistent SUO output.

**Functions**:

- Deduplicates rapid-fire RFID events (V6800)
- Normalizes temperature/humidity sensor indexing
- Standardizes door state representations
- Handles multi-module message flattening

**When to use**: Essential when mixing V5008 and V6800 devices. Enable even for single device type deployments for future compatibility.

**Configuration**:

```bash
MODULE_PROTOCOL_ADAPTER_ENABLED=true
MODULE_PROTOCOL_ADAPTER_DEDUP_WINDOW=1000  # 1 second deduplication window
```

### Module Dependencies

Some modules depend on others:

- **Dashboard** → Requires `OUTPUT_WEBSOCKET_ENABLED=true`
- **Real-time UI** → Requires `OUTPUT_WEBSOCKET_ENABLED=true`
- **Command Service** → Requires `MODULE_WEBSOCKET_ENABLED=true` (optional)
- **Database Writer** → Requires `DB_ENABLED=true`
- **UOS Cache** → Requires `ENABLE_CACHE=true`

### Performance Considerations

**Resource Usage by Module** (approximate):

| Module           | CPU Impact | Memory Impact | Network Impact                |
| ---------------- | ---------- | ------------- | ----------------------------- |
| Smart Heartbeat  | Low        | Low           | Medium (queries devices)      |
| Watchdog         | Very Low   | Very Low      | None                          |
| MQTT Relay       | Low        | Low           | High (forwards all messages)  |
| WebSocket        | Medium     | Medium        | Medium (per connected client) |
| Webhook          | Low        | Low           | High (HTTP POSTs)             |
| Protocol Adapter | Low        | Very Low      | None                          |
| Database         | Medium     | Medium        | Low (local DB queries)        |
| Cache            | Low        | High\*        | None                          |

\*Cache can use up to 10K entries × average message size

**Recommendation**: Start with minimal configuration and enable modules incrementally based on your requirements.

## 📊 Monitor (Lightweight UI)

The MQTT Middleware Pro includes a lightweight monitoring interface for quick device status checks and debugging.

**URL**: http://localhost:3000/monitor

**Note**: For the full-featured React dashboard, use [dashboardPro](#dashboardpro) instead.

### Features

- **Device Registry**: View all connected devices with online/offline status
- **Real-time Telemetry**: Live temperature, humidity, RFID, and door state data
- **Command Interface**: Send commands to devices directly from the UI
- **System Log**: View real-time system events and message logs
- **Module Visualization**: Visual representation of RFID slots and sensor data

### Screenshot

The dashboard features a retro-futuristic industrial design with:

- Dark theme optimized for control room environments
- Real-time WebSocket updates
- Responsive grid layout
- Animated status indicators

## 📚 API Documentation

### Health Check

```bash
curl http://localhost:3000/health
```

### Devices

```bash
# List all devices
curl http://localhost:3000/api/v1/devices

# Get device details
curl http://localhost:3000/api/v1/devices/2437871205

# Get device modules
curl http://localhost:3000/api/v1/devices/2437871205/modules

# Query device history
curl "http://localhost:3000/api/v1/devices/2437871205/history?type=SUO_HEARTBEAT&limit=10"
```

### Commands

```bash
# Send command to device
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
```

### Statistics

```bash
# Get all statistics
curl http://localhost:3000/api/v1/stats

# Get specific stats
curl http://localhost:3000/api/v1/stats/cache
curl http://localhost:3000/api/v1/stats/mqtt
curl http://localhost:3000/api/v1/stats/database
```

For complete API documentation, see [API.md](specs/API.md).

## 🔌 WebSocket Usage

Connect to `ws://localhost:3001/ws` for real-time updates.

### JavaScript Example

```javascript
const ws = new WebSocket('ws://localhost:3001/ws');

ws.onopen = () => {
  console.log('Connected');

  // Subscribe to specific devices
  ws.send(
    JSON.stringify({
      type: 'subscribe',
      devices: ['2437871205'],
      types: ['SUO_HEARTBEAT', 'SUO_RFID_SNAPSHOT'],
    })
  );
};

ws.onmessage = event => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};

ws.onerror = error => {
  console.error('WebSocket error:', error);
};

// Ping to keep connection alive
setInterval(() => {
  ws.send(JSON.stringify({ type: 'ping' }));
}, 30000);
```

### Message Types

| Type            | Direction       | Description                    |
| --------------- | --------------- | ------------------------------ |
| `connection`    | Server → Client | Connection confirmation        |
| `message`       | Server → Client | SUO message from device        |
| `subscribe`     | Client → Server | Subscribe to devices/types     |
| `unsubscribe`   | Client → Server | Unsubscribe from devices/types |
| `ping` / `pong` | Both            | Keep connection alive          |

## 🛠️ Development

### Project Structure

```
mqtt-middleware-pro/
├── src/
│   ├── api/                    # REST API
│   │   ├── controllers/        # API controllers
│   │   ├── middleware/         # Express middleware
│   │   ├── routes/             # API routes
│   │   └── server.ts           # Express server
│   ├── config/                 # Configuration
│   ├── core/                   # Core modules
│   │   ├── event-bus/          # Event-driven architecture
│   │   ├── mqtt/               # MQTT subscriber
│   │   ├── parser/             # RAW → SIF parsers
│   │   └── normalizer/         # SIF → SUO normalizers
│   ├── database/               # Database layer
│   │   ├── database.ts         # Connection pool
│   │   ├── database-writer.ts  # Batch writer
│   │   └── suo-repository.ts   # Data access
│   ├── modules/                # Optional modules
│   │   ├── cache/              # UOS cache
│   │   ├── command/            # Command service
│   │   ├── smart-hb/           # Smart heartbeat
│   │   └── watchdog/           # Scheduled tasks
│   ├── output/                 # Output modules
│   │   ├── mqtt-relay.ts       # MQTT relay
│   │   ├── websocket-server.ts # WebSocket server
│   │   └── webhook-dispatcher.ts # Webhook dispatcher
│   ├── types/                  # TypeScript definitions
│   └── utils/                  # Utilities
├── tests/                      # Test files
├── specs/                      # Documentation
│   ├── prd.md                  # Requirements
│   ├── architecture.md         # System architecture
│   ├── API.md                  # REST API documentation
│   └── *_spec.md               # Protocol specs
├── docker-compose.yml          # Docker services
├── Dockerfile                  # Container image
└── package.json
```

### Available Scripts

````bash
# Development
npm run dev              # Hot reload with tsx
npm start                # Production start

# Build
npm run build            # Compile TypeScript
npm run clean            # Clean dist/

# Testing

```bash
# Run all tests (Jest unit tests + Real message tests)
npm test

# Run real device message tests only
npm run test:real

# Run unit tests only
npm run test:unit

# Run specific test file
npx jest tests/unit/core/parser/v5008-parser.spec.ts

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
````

### Real Message Testing

In addition to unit tests, we validate the parser/normalizer pipeline against **real device messages**:

```bash
npm run test:real
```

This runs tests defined in `tests/real-messages/`:

- **v5008-msg-list.md** - 10 V5008 binary message test cases
- **v6800-msg-list.md** - 9 V6800 JSON message test cases

Each test case includes:

- Raw hex/JSON input from actual devices
- Expected SIF (Standard Intermediate Format) output
- Expected SUO (Standard Unified Object) output

**Adding New Test Cases:**

1. Add raw message to `tests/real-messages/v5008-raw-list.txt` or `v6800-raw-list.txt`
2. Run `npx tsx tests/real-messages/regenerate-expected.ts` to generate expected outputs
3. Copy outputs into the corresponding `.md` file
4. Run `npm run test:real` to verify

### Testing

```bash
# Run all tests
npm test

# Run specific test file
npx jest tests/unit/core/parser/v5008-parser.spec.ts

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Adding a New Parser

1. Create parser in `src/core/parser/{name}-parser.ts`
2. Implement `IMessageParser` interface
3. Add to `ParserFactory`
4. Create test fixtures in `tests/fixtures/`
5. Write unit tests

## 🚢 Deployment

### Docker Deployment

```bash
# Build image
docker build -t mqtt-middleware-pro .

# Run with environment variables
docker run -d \
  -p 3000:3000 \
  -p 3001:3001 \
  -e MQTT_BROKER_URL=mqtt://broker:1883 \
  -e DB_ENABLED=true \
  -e DB_HOST=mysql \
  --name mqtt-middleware \
  mqtt-middleware-pro
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mqtt-middleware
spec:
  replicas: 2
  selector:
    matchLabels:
      app: mqtt-middleware
  template:
    metadata:
      labels:
        app: mqtt-middleware
    spec:
      containers:
        - name: app
          image: mqtt-middleware-pro:latest
          ports:
            - containerPort: 3000
            - containerPort: 3001
          env:
            - name: MQTT_BROKER_URL
              value: 'mqtt://emqx:1883'
            - name: DB_ENABLED
              value: 'true'
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
```

### Environment-Specific Configurations

**Development**:

```bash
NODE_ENV=development
LOG_LEVEL=debug
DB_ENABLED=false
```

**Production**:

```bash
NODE_ENV=production
LOG_LEVEL=info
DB_ENABLED=true
API_ENABLE_CORS=false
```

## 🔍 Troubleshooting

### Common Issues

#### MQTT Connection Failed

```
Error: connect ECONNREFUSED 127.0.0.1:1883
```

**Solution**: Ensure MQTT broker is running:

```bash
docker-compose ps
# or start it
docker-compose up -d mqtt-broker
```

#### Database Connection Failed

```
Error: Access denied for user 'root'@'172.18.0.1'
```

**Solution**: Check database credentials in `.env`:

```bash
# Test connection
mysql -h localhost -u root -p
```

#### Port Already in Use

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution**: Kill process using port 3000:

```bash
# Linux/Mac
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

#### TypeScript Compilation Errors

```bash
# Clean and rebuild
npm run clean
npm run build

# Check types without emitting
npm run typecheck
```

### Debug Mode

Enable debug logging:

```bash
LOG_LEVEL=debug npm run dev
```

### Health Check Debugging

```bash
# Check health endpoint
curl -v http://localhost:3000/health

# Check specific service status
curl http://localhost:3000/api/v1/stats
```

### Logs

View logs:

```bash
# Docker logs
docker-compose logs -f app

# Application logs (if configured)
tail -f logs/app.log
```

## 📄 License

ISC License - see LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/mqtt-middleware-pro/issues)
- **Documentation**: [API.md](specs/API.md), [architecture.md](specs/architecture.md)
- **Email**: support@yourdomain.com

---

<p align="center">
  Built with ❤️ using TypeScript, Node.js, and MQTT
</p>
