# Middleware Simulator Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a standalone CLI tool that validates the MQTT Middleware Pro pipeline end-to-end by running the actual middleware with device emulators

**Architecture:** Create simulator/ directory with CLI interface, embedded MQTT broker (aedes), device emulators for V5008/V6800, test scenarios for validation, and assertion engine. Tests run actual Parser/Normalizer/SmartHB/ProtocolAdapter modules against emulated devices.

**Tech Stack:** TypeScript, Node.js, aedes (MQTT broker), mqtt (client), commander (CLI), chalk (colors), ora (spinners)

---

## Task 1: Initialize Simulator Project Structure

**Files:**
- Create: `simulator/package.json`
- Create: `simulator/tsconfig.json`
- Create: `simulator/.gitignore`
- Create: `simulator/README.md`

**Step 1: Create package.json**

```json
{
  "name": "mqtt-middleware-simulator",
  "version": "1.0.0",
  "description": "CLI tool for testing MQTT Middleware Pro pipeline",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "simulator": "./dist/cli.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/cli.ts",
    "start": "node dist/cli.js",
    "test": "vitest"
  },
  "dependencies": {
    "aedes": "^0.50.0",
    "chalk": "^5.3.0",
    "commander": "^11.1.0",
    "mqtt": "^5.3.0",
    "ora": "^8.0.1"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.0",
    "vitest": "^1.2.0"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "lib": ["ES2022"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: Create .gitignore**

```
node_modules/
dist/
*.log
.DS_Store
coverage/
.env
```

**Step 4: Create README.md**

```markdown
# MQTT Middleware Simulator

CLI tool for testing MQTT Middleware Pro pipeline end-to-end.

## Usage

```bash
npm run dev                    # Run with tsx
npm run build && npm start    # Build and run
```

## Commands

- `simulator` - Run all tests
- `simulator --pattern "SmartHB*"` - Run specific tests
- `simulator --verbose` - Show detailed logs
- `simulator --format json` - Output JSON for CI/CD
```

**Step 5: Install dependencies**

```bash
cd simulator
npm install
```

**Step 6: Commit**

```bash
git add simulator/
git commit -m "feat(simulator): initialize project structure"
```

---

## Task 2: Create CLI Interface

**Files:**
- Create: `simulator/src/cli.ts`

**Step 1: Write CLI with commander**

```typescript
#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { TestRunner } from './runner/test-runner.js';
import { SimulatorOptions } from './types.js';

const program = new Command();

program
  .name('simulator')
  .description('MQTT Middleware Pro test simulator')
  .version('1.0.0')
  .option('-p, --pattern <pattern>', 'Run tests matching pattern')
  .option('-d, --device-types <types>', 'Filter by device types (V5008,V6800)')
  .option('-v, --verbose', 'Show detailed output')
  .option('-t, --timeout <ms>', 'Test timeout in milliseconds', '30000')
  .option('--parallel', 'Run tests in parallel')
  .option('-f, --format <format>', 'Output format (console|json)', 'console')
  .option('-o, --output-file <file>', 'Save results to file')
  .option('--broker-port <port>', 'MQTT broker port', '1884')
  .action(async (options) => {
    const simulatorOptions: SimulatorOptions = {
      testPattern: options.pattern,
      deviceTypes: options.deviceTypes?.split(',') as ('V5008' | 'V6800')[],
      verbose: options.verbose,
      timeout: parseInt(options.timeout),
      parallel: options.parallel,
      format: options.format,
      outputFile: options.outputFile,
      brokerPort: parseInt(options.brokerPort),
    };

    console.log(chalk.blue.bold('MQTT Middleware Simulator v1.0.0'));
    console.log(chalk.gray('='.repeat(40)));
    console.log();

    const runner = new TestRunner(simulatorOptions);
    
    try {
      await runner.initialize();
      const report = await runner.runAll(simulatorOptions);
      
      if (options.format === 'json' && options.outputFile) {
        await runner.saveReport(report, options.outputFile);
      }
      
      await runner.cleanup();
      
      process.exit(report.summary.failed > 0 ? 1 : 0);
    } catch (error) {
      console.error(chalk.red('Fatal error:'), error);
      await runner.cleanup();
      process.exit(1);
    }
  });

program.parse();
```

**Step 2: Create types.ts**

```typescript
export interface SimulatorOptions {
  testPattern?: string;
  deviceTypes?: ('V5008' | 'V6800')[];
  verbose?: boolean;
  timeout?: number;
  parallel?: boolean;
  format?: 'console' | 'json';
  outputFile?: string;
  brokerPort?: number;
}

export interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  assertions?: number;
  error?: string;
  steps?: TestStep[];
}

export interface TestStep {
  action: string;
  status: 'ok' | 'failed' | 'pending';
  details?: string;
}

export interface TestReport {
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  };
  coverage: Record<string, { tested: number; total: number; percentage: number }>;
  results: TestResult[];
}
```

**Step 3: Test CLI parsing**

```bash
cd simulator
npx tsx src/cli.ts --help
```

Expected output shows help with all options.

**Step 4: Commit**

```bash
git add simulator/src/cli.ts simulator/src/types.ts
git commit -m "feat(simulator): add CLI interface with commander"
```

---

## Task 3: Create Embedded MQTT Broker

**Files:**
- Create: `simulator/src/broker/embedded-broker.ts`
- Create: `simulator/src/broker/index.ts`

**Step 1: Implement embedded broker**

```typescript
import { Aedes } from 'aedes';
import { createServer } from 'net';
import { logger } from '../utils/logger.js';

export interface BrokerConfig {
  port: number;
  host?: string;
}

export class EmbeddedBroker {
  private aedes: Aedes;
  private server: ReturnType<typeof createServer>;
  private config: BrokerConfig;

  constructor(config: BrokerConfig) {
    this.config = config;
    this.aedes = new Aedes();
    this.server = createServer(this.aedes.handle);
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.listen(this.config.port, this.config.host || 'localhost', () => {
        logger.info(`MQTT broker started on port ${this.config.port}`);
        resolve();
      });

      this.server.on('error', reject);
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => {
        this.aedes.close(() => {
          logger.info('MQTT broker stopped');
          resolve();
        });
      });
    });
  }

  getPort(): number {
    return this.config.port;
  }
}
```

**Step 2: Create broker index**

```typescript
export { EmbeddedBroker } from './embedded-broker.js';
export type { BrokerConfig } from './embedded-broker.js';
```

**Step 3: Create logger utility**

```typescript
import chalk from 'chalk';

export const logger = {
  info: (msg: string) => console.log(chalk.blue('[INFO]'), msg),
  success: (msg: string) => console.log(chalk.green('[PASS]'), msg),
  error: (msg: string) => console.log(chalk.red('[FAIL]'), msg),
  warn: (msg: string) => console.log(chalk.yellow('[WARN]'), msg),
  debug: (msg: string) => console.log(chalk.gray('[DEBUG]'), msg),
};
```

**Step 4: Commit**

```bash
git add simulator/src/broker/ simulator/src/utils/logger.ts
git commit -m "feat(simulator): add embedded MQTT broker (aedes)"
```

---

## Tas
