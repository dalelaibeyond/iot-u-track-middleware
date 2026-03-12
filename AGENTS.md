# MQTT Middleware Pro - Agent Guide

IoT gateway middleware for V5008 (binary) and V6800 (JSON) devices.

**Architecture Pipeline:** `RAW → SIF → SUO → UOS (Cache) + DB`

## Build Commands

```bash
npm run dev                 # Hot reload with tsx
npm run build               # Compile TypeScript
npm run build:prod          # Bundle with esbuild
npm start                   # Production start
npm run clean               # Remove dist/
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
npx jest --testNamePattern="should parse"
npx jest --verbose
```

## Lint & Format

```bash
npm run lint                # Check for issues
npm run lint:fix            # Auto-fix issues
npm run format              # Format with Prettier
npm run format:check        # Check formatting
```

## Code Style

### Naming Conventions

| Type                | Convention                 | Example                        |
| ------------------- | -------------------------- | ------------------------------ |
| Classes             | PascalCase                 | `MessageParser`, `V5008Parser` |
| Interfaces          | PascalCase with `I` prefix | `IMessageParser`, `IModule`    |
| Functions/Variables | camelCase                  | `parseMessage`, `deviceId`     |
| Constants           | UPPER_SNAKE_CASE           | `DEFAULT_PORT`                 |
| Files               | kebab-case                 | `mqtt-subscriber.ts`           |
| Private members     | `_camelCase`               | `_config`, `_logger`           |

### Import Order

```typescript
import mqtt from "mqtt"; // 1. External dependencies
import { IModule } from "@t/index"; // 2. Internal types
import { parseMessage } from "@core/parser"; // 3. Internal modules
```

### TypeScript Patterns

```typescript
interface IMessageParser {
  parse(rawMessage: RawMQTTMessage): Promise<SIFMessage>;
  supports(deviceType: string): boolean;
}
export class V5008Parser implements IMessageParser {
  async parse(rawMessage: RawMQTTMessage): Promise<SIFMessage> {
    /* impl */
  }
}
```

### Error Handling

```typescript
try {
  const result = await operation();
  return result;
} catch (error) {
  logger.error("Operation failed", { error: error.message });
  throw new ProcessingError("Descriptive message", { cause: error });
}
promise.catch((err) => handleError(err));
```

### Async Patterns

```typescript
async function processData(data: Data): Promise<void> {
  const parsed = await parser.parse(data);
  await eventBus.emit("message", parsed);
}
const [r1, r2] = await Promise.all([fetch1(), fetch2()]);
```

## Path Aliases

`@/*` → `src/*`, `@t/*` → `src/types/*`, `@core/*` → `src/core/*`, `@modules/*` → `src/modules/*`, `@database/*` → `src/database/*`, `@api/*` → `src/api/*`, `@utils/*` → `src/utils/*`, `@fixtures/*` → `tests/fixtures/*`

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
  it("should parse HEARTBEAT message", async () => {
    // Test implementation
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

**Event Types:** `raw.mqtt.message` → RawMQTTMessage, `sif.message` → SIFMessage, `suo.mqtt.message` → SUOMessage

## Other Commands

```bash
# Docker
npm run docker:dev          # Start dev environment
npm run docker:logs         # View logs
npm run docker:stop         # Stop environment

# Database
npm run db:migrate          # Run migrations
npm run db:clean            # Clean database
```

## Troubleshooting

- **Build Errors:** Run `npm run clean` before rebuilding
- **Test Failures:** Run with `--verbose` flag for detailed output
- **MQTT Issues:** Verify broker with `docker-compose ps`
