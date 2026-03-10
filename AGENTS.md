# MQTT Middleware Pro - Agent Guide

IoT gateway middleware for V5008 (binary) and V6800 (JSON) devices.

## Quick Reference

**Architecture Pipeline:** `RAW → SIF → SUO → UOS (Cache) + DB`

| Device | Protocol | Spec                  |
| ------ | -------- | --------------------- |
| V5008  | Binary   | `specs/V5008_Spec.md` |
| V6800  | JSON     | `specs/v6800_spec.md` |

## Build Commands

```bash
# Development
npm run dev                 # Hot reload with tsx
npm run build               # Compile TypeScript
npm run build:prod          # Bundle with esbuild
npm start                   # Production start
npm run clean               # Remove dist/

# Type checking
npm run typecheck           # Check without emit
```

## Test Commands

```bash
npm test                    # Run all tests
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests
npm run test:coverage       # Coverage report
npm run test:watch          # Watch mode
npm run test:real           # Real message tests

# Run single test file (CRITICAL)
npx jest tests/unit/core/parser/v5008-parser.spec.ts
npx jest tests/unit/core/parser/v6800-parser.spec.ts
npx jest --testNamePattern="should parse"
npx jest --verbose
```

## Lint & Format Commands

```bash
npm run lint                # Check for issues
npm run lint:fix            # Auto-fix issues
npm run format              # Format with Prettier
npm run format:check        # Check formatting
```

## Code Style Guidelines

### Naming Conventions

| Type                | Convention                 | Example                                 |
| ------------------- | -------------------------- | --------------------------------------- |
| Classes             | PascalCase                 | `MessageParser`, `V5008Parser`          |
| Interfaces          | PascalCase with `I` prefix | `IMessageParser`, `IModule`             |
| Functions/Variables | camelCase                  | `parseMessage`, `deviceId`              |
| Constants           | UPPER_SNAKE_CASE           | `DEFAULT_PORT`, `MAX_RETRY_COUNT`       |
| Files               | kebab-case                 | `mqtt-subscriber.ts`, `v5008-parser.ts` |
| Private members     | `_camelCase`               | `_config`, `_logger`                    |

### Import Order

```typescript
// 1. External dependencies
import mqtt from "mqtt";
import { EventEmitter } from "events";

// 2. Internal types
import { IModule } from "@t/index";
import { SIFMessage } from "@t/sif.types";

// 3. Internal modules
import { parseMessage } from "@core/parser";
import { Logger } from "@utils/logger";
```

### TypeScript Patterns

```typescript
// Define interfaces before implementations
interface IMessageParser {
  parse(rawMessage: RawMQTTMessage): Promise<SIFMessage>;
  supports(deviceType: string): boolean;
}

// Use explicit return types for public APIs
export class V5008Parser implements IMessageParser {
  async parse(rawMessage: RawMQTTMessage): Promise<SIFMessage> {
    // implementation
  }

  supports(deviceType: string): boolean {
    return deviceType === "V5008";
  }
}
```

### Error Handling

```typescript
// Use typed errors, never swallow exceptions
try {
  const result = await operation();
  return result;
} catch (error) {
  logger.error("Operation failed", {
    error: error instanceof Error ? error.message : String(error),
    context: "operationName",
  });
  throw new ProcessingError("Descriptive message", { cause: error });
}

// Always handle Promise rejections
promise.catch((err) => handleError(err));
```

### Async Patterns

```typescript
// Prefer async/await over raw promises
async function processData(data: Data): Promise<void> {
  const parsed = await parser.parse(data);
  const normalized = await normalizer.normalize(parsed);
  await eventBus.emit("message", normalized);
}

// Use Promise.all for parallel operations
const [result1, result2] = await Promise.all([fetchData1(), fetchData2()]);
```

## Path Aliases (tsconfig)

| Alias         | Maps to            |
| ------------- | ------------------ |
| `@/*`         | `src/*`            |
| `@t/*`        | `src/types/*`      |
| `@core/*`     | `src/core/*`       |
| `@modules/*`  | `src/modules/*`    |
| `@database/*` | `src/database/*`   |
| `@api/*`      | `src/api/*`        |
| `@utils/*`    | `src/utils/*`      |
| `@fixtures/*` | `tests/fixtures/*` |

## Critical Rules

1. **ES Modules only** - No CommonJS (`require`/`module.exports`)
2. **No pseudo-code** - All code must be production-ready
3. **DRY principle** - Extract shared logic
4. **Interface-first** - Define types/interfaces before implementations
5. **MySQL only** - v1.0 supports MySQL 8.0 only
6. **Follow specs/architecture.md** - Don't redesign existing patterns

## Testing Guidelines

- **Framework:** Jest with ts-jest preset
- **Setup:** `tests/setup.ts` runs before each test file
- **Fixtures:** Test data in `tests/fixtures/`
- **Pattern:** Mirror source structure in `tests/unit/`

```typescript
describe("V5008 Parser", () => {
  let parser: V5008Parser;

  beforeEach(() => {
    parser = new V5008Parser();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("HEARTBEAT Message Parsing", () => {
    it("should parse single module HEARTBEAT message", async () => {
      // Test implementation
    });
  });
});
```

## Module System

All modules implement `IModule`:

```typescript
interface IModule {
  name: string;
  enabled: boolean;
  initialize(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  getStatus(): ModuleStatus;
}
```

## Data Flow

```
Device → MQTT Broker → MQTTSubscriber → EventBus → Parser → Normalizer → Output Modules
```

**Event Types:**

- `raw.mqtt.message` → RawMQTTMessage
- `sif.message` → SIFMessage
- `suo.mqtt.message` → SUOMessage

## Docker Commands

```bash
npm run docker:dev          # Start dev environment
npm run docker:logs         # View logs
npm run docker:stop         # Stop environment
```

## Database Commands

```bash
npm run db:migrate          # Run migrations
npm run db:clean            # Clean database
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
NODE_ENV=development
PORT=3000
MQTT_BROKER_URL=mqtt://localhost:1883
DB_HOST=localhost
DB_PORT=3306
DB_NAME=mqtt_middleware
```

## Troubleshooting

**Build Errors:**

- Run `npm run clean` before rebuilding
- Check TypeScript version matches `~5.9.3`

**Test Failures:**

- Run with `--verbose` flag for detailed output
- Check `tests/setup.ts` for environment setup

**MQTT Issues:**

- Verify broker: `docker-compose ps`
- Check `.env` credentials
- Review logs: `npm run docker:logs`
