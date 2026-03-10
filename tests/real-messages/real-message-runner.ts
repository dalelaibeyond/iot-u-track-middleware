/**
 * Real Message Test Runner
 *
 * Reads markdown test specification files and validates the actual
 * parser → normalizer pipeline against expected outputs.
 *
 * Usage: npx tsx tests/real-messages/real-message-runner.ts
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { V5008Parser } from '../../src/core/parser/v5008-parser';
import { V6800Parser } from '../../src/core/parser/v6800-parser';
import { V5008Normalizer } from '../../src/core/normalizer/v5008-normalizer';
import { V6800Normalizer } from '../../src/core/normalizer/v6800-normalizer';
import { RawMQTTMessage } from '../../src/core/parser/parser.interface';
import { SIFMessage } from '../../src/types/sif.types';
import { AnySUOMessage } from '../../src/types/suo.types';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
};

interface TestCase {
  name: string;
  description: string;
  topic: string;
  rawInput: string;
  rawType: 'hex' | 'json';
  expectedSIF: unknown;
  expectedSUO: unknown;
}

interface TestResult {
  name: string;
  deviceType: 'V5008' | 'V6800';
  sifMatch: boolean;
  suoMatch: boolean;
  errors: string[];
}

/**
 * Parse markdown file to extract test cases
 */
function parseMarkdownFile(filePath: string, deviceType: 'V5008' | 'V6800'): TestCase[] {
  const content = readFileSync(filePath, 'utf-8');
  const testCases: TestCase[] = [];

  // Split by test case headers
  const testBlocks = content.split(/## Test Case \d+:/);

  for (const block of testBlocks) {
    if (!block.trim()) continue;

    // Extract test name (first line)
    const lines = block.trim().split('\n');
    const name = lines[0].trim();

    // Extract description
    const descMatch = block.match(/\*\*Description:\*\*\s*(.+)/);
    const description = descMatch ? descMatch[1].trim() : '';

    // Extract topic
    const topicMatch = block.match(/\*\*Topic:\*\*\s*(.+)/);
    const topic = topicMatch ? topicMatch[1].trim() : '';

    // Extract raw input
    let rawInput = '';
    let rawType: 'hex' | 'json' = 'hex';

    if (deviceType === 'V5008') {
      const rawMatch = block.match(/### Raw Input \(Hex\)\s*```\s*([0-9A-Fa-f]+)/);
      if (rawMatch) {
        rawInput = rawMatch[1].trim();
        rawType = 'hex';
      }
    } else {
      const rawMatch = block.match(/### Raw Input \(JSON\)\s*```json\s*([\s\S]+?)```/);
      if (rawMatch) {
        rawInput = rawMatch[1].trim();
        rawType = 'json';
      }
    }

    // Extract expected SIF
    const sifMatch = block.match(/### Expected SIF Output\s*```json\s*([\s\S]+?)```/);
    let expectedSIF: unknown = null;
    if (sifMatch) {
      try {
        expectedSIF = JSON.parse(sifMatch[1]);
      } catch {
        console.warn(`Failed to parse SIF JSON for test: ${name}`);
      }
    }

    // Extract expected SUO
    const suoMatch = block.match(/### Expected SUO Output\s*```json\s*([\s\S]+?)```/);
    let expectedSUO: unknown = null;
    if (suoMatch) {
      try {
        expectedSUO = JSON.parse(suoMatch[1]);
      } catch {
        console.warn(`Failed to parse SUO JSON for test: ${name}`);
      }
    }

    if (rawInput && expectedSIF && expectedSUO) {
      testCases.push({
        name,
        description,
        topic,
        rawInput,
        rawType,
        expectedSIF,
        expectedSUO,
      });
    }
  }

  return testCases;
}

/**
 * Deep comparison of objects, ignoring timestamp fields
 */
function deepCompare(actual: unknown, expected: unknown, path = ''): string[] {
  const errors: string[] = [];

  // Handle null/undefined
  if (actual === null || actual === undefined) {
    if (expected !== null && expected !== undefined) {
      errors.push(`${path}: expected ${JSON.stringify(expected)}, got ${actual}`);
    }
    return errors;
  }

  if (expected === null || expected === undefined) {
    errors.push(`${path}: expected null/undefined, got ${JSON.stringify(actual)}`);
    return errors;
  }

  // Skip timestamp comparisons (they'll always differ)
  if (path.endsWith('Timestamp') || path.endsWith('.timestamp')) {
    return errors;
  }

  // Handle arrays
  if (Array.isArray(actual) && Array.isArray(expected)) {
    if (actual.length !== expected.length) {
      errors.push(`${path}: array length mismatch (${actual.length} vs ${expected.length})`);
    } else {
      for (let i = 0; i < actual.length; i++) {
        errors.push(...deepCompare(actual[i], expected[i], `${path}[${i}]`));
      }
    }
    return errors;
  }

  // Handle objects
  if (typeof actual === 'object' && typeof expected === 'object') {
    const actualKeys = Object.keys(actual as object);
    const expectedKeys = Object.keys(expected as object);

    // Check for missing keys
    for (const key of expectedKeys) {
      if (!(key in (actual as object))) {
        errors.push(`${path}.${key}: missing in actual`);
      }
    }

    // Check for extra keys
    for (const key of actualKeys) {
      if (!(key in (expected as object))) {
        errors.push(`${path}.${key}: unexpected extra key`);
      }
    }

    // Compare values
    for (const key of expectedKeys) {
      if (key in (actual as object)) {
        errors.push(
          ...deepCompare(
            (actual as Record<string, unknown>)[key],
            (expected as Record<string, unknown>)[key],
            path ? `${path}.${key}` : key
          )
        );
      }
    }

    return errors;
  }

  // Handle primitives
  if (actual !== expected) {
    errors.push(`${path}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }

  return errors;
}

/**
 * Run a single test case
 */
async function runTestCase(testCase: TestCase, deviceType: 'V5008' | 'V6800'): Promise<TestResult> {
  const errors: string[] = [];
  let sifMatch = false;
  let suoMatch = false;

  try {
    // Create raw message
    let payload: Buffer;
    if (testCase.rawType === 'hex') {
      payload = Buffer.from(testCase.rawInput, 'hex');
    } else {
      payload = Buffer.from(testCase.rawInput, 'utf-8');
    }

    const rawMessage: RawMQTTMessage = {
      topic: testCase.topic,
      payload,
      qos: 0,
      retain: false,
      timestamp: new Date(),
    };

    // Parse
    let sifMessage: SIFMessage;
    if (deviceType === 'V5008') {
      const parser = new V5008Parser();
      sifMessage = await parser.parse(rawMessage);
    } else {
      const parser = new V6800Parser();
      sifMessage = await parser.parse(rawMessage);
    }

    // Compare SIF (ignore meta.topic and meta.rawHex/rawType as they might differ in format)
    const sifCopy = JSON.parse(JSON.stringify(sifMessage));
    const expectedSIF = JSON.parse(JSON.stringify(testCase.expectedSIF)) as Record<string, unknown>;

    // Normalize meta fields for comparison - remove fields that may differ
    if (sifCopy.meta) {
      delete (sifCopy.meta as Record<string, unknown>).rawHex;
      delete (sifCopy.meta as Record<string, unknown>).rawType;
      delete (sifCopy.meta as Record<string, unknown>).topic;
    }
    if (expectedSIF.meta) {
      delete (expectedSIF.meta as Record<string, unknown>).rawHex;
      delete (expectedSIF.meta as Record<string, unknown>).rawType;
      delete (expectedSIF.meta as Record<string, unknown>).topic;
    }

    const sifErrors = deepCompare(sifCopy, expectedSIF, 'SIF');
    sifMatch = sifErrors.length === 0;
    errors.push(...sifErrors);

    // Normalize
    let suoMessages: AnySUOMessage | AnySUOMessage[];
    if (deviceType === 'V5008') {
      const normalizer = new V5008Normalizer();
      suoMessages = await normalizer.normalize(sifMessage);
    } else {
      const normalizer = new V6800Normalizer();
      suoMessages = await normalizer.normalize(sifMessage);
    }

    // Compare SUO (handle both single message and array)
    const expectedSUO = testCase.expectedSUO;
    const suoArray = Array.isArray(suoMessages) ? suoMessages : [suoMessages];

    // For V6800, expected SUO might be a single message but actual is array
    // Compare first message in array
    if (suoArray.length > 0) {
      const suoCopy = JSON.parse(JSON.stringify(suoArray[0]));

      // Remove timestamp fields
      delete suoCopy.serverTimestamp;
      delete suoCopy.deviceTimestamp;

      const suoErrors = deepCompare(suoCopy, expectedSUO, 'SUO');
      suoMatch = suoErrors.length === 0;
      errors.push(...suoErrors);
    }
  } catch (error) {
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    name: testCase.name,
    deviceType,
    sifMatch,
    suoMatch,
    errors,
  };
}

/**
 * Run all tests and print results
 */
async function main(): Promise<void> {
  console.log(
    `${colors.bold}═══════════════════════════════════════════════════════════${colors.reset}`
  );
  console.log(`${colors.bold}       REAL MESSAGE TEST RUNNER${colors.reset}`);
  console.log(
    `${colors.bold}═══════════════════════════════════════════════════════════${colors.reset}\n`
  );

  const results: TestResult[] = [];

  // Run V5008 tests
  console.log(`${colors.blue}▶ V5008 Tests${colors.reset}`);
  console.log(
    `${colors.blue}─────────────────────────────────────────────────────────${colors.reset}`
  );
  const v5008Path = join(__dirname, 'v5008-msg-list.md');
  const v5008Tests = parseMarkdownFile(v5008Path, 'V5008');

  for (let i = 0; i < v5008Tests.length; i++) {
    const test = v5008Tests[i];
    const result = await runTestCase(test, 'V5008');
    results.push(result);

    const status =
      result.sifMatch && result.suoMatch
        ? `${colors.green}✓ PASS${colors.reset}`
        : `${colors.red}✗ FAIL${colors.reset}`;

    console.log(`  ${String(i + 1).padStart(2)}. ${status} ${test.name}`);

    if (!result.sifMatch) {
      console.log(`      ${colors.red}SIF mismatch${colors.reset}`);
    }
    if (!result.suoMatch) {
      console.log(`      ${colors.red}SUO mismatch${colors.reset}`);
    }

    if (result.errors.length > 0 && (!result.sifMatch || !result.suoMatch)) {
      for (const error of result.errors.slice(0, 3)) {
        console.log(`      ${colors.yellow}  - ${error}${colors.reset}`);
      }
      if (result.errors.length > 3) {
        console.log(
          `      ${colors.yellow}  ... and ${result.errors.length - 3} more errors${colors.reset}`
        );
      }
    }
  }

  console.log();

  // Run V6800 tests
  console.log(`${colors.blue}▶ V6800 Tests${colors.reset}`);
  console.log(
    `${colors.blue}─────────────────────────────────────────────────────────${colors.reset}`
  );
  const v6800Path = join(__dirname, 'v6800-msg-list.md');
  const v6800Tests = parseMarkdownFile(v6800Path, 'V6800');

  for (let i = 0; i < v6800Tests.length; i++) {
    const test = v6800Tests[i];
    const result = await runTestCase(test, 'V6800');
    results.push(result);

    const status =
      result.sifMatch && result.suoMatch
        ? `${colors.green}✓ PASS${colors.reset}`
        : `${colors.red}✗ FAIL${colors.reset}`;

    console.log(`  ${String(i + 1).padStart(2)}. ${status} ${test.name}`);

    if (!result.sifMatch) {
      console.log(`      ${colors.red}SIF mismatch${colors.reset}`);
    }
    if (!result.suoMatch) {
      console.log(`      ${colors.red}SUO mismatch${colors.reset}`);
    }

    if (result.errors.length > 0 && (!result.sifMatch || !result.suoMatch)) {
      for (const error of result.errors.slice(0, 3)) {
        console.log(`      ${colors.yellow}  - ${error}${colors.reset}`);
      }
      if (result.errors.length > 3) {
        console.log(
          `      ${colors.yellow}  ... and ${result.errors.length - 3} more errors${colors.reset}`
        );
      }
    }
  }

  // Print summary
  console.log();
  console.log(
    `${colors.bold}═══════════════════════════════════════════════════════════${colors.reset}`
  );
  console.log(`${colors.bold}                       SUMMARY${colors.reset}`);
  console.log(
    `${colors.bold}═══════════════════════════════════════════════════════════${colors.reset}`
  );

  const v5008Results = results.filter(r => r.deviceType === 'V5008');
  const v6800Results = results.filter(r => r.deviceType === 'V6800');

  const v5008Passed = v5008Results.filter(r => r.sifMatch && r.suoMatch).length;
  const v6800Passed = v6800Results.filter(r => r.sifMatch && r.suoMatch).length;

  const totalTests = results.length;
  const totalPassed = v5008Passed + v6800Passed;
  const totalFailed = totalTests - totalPassed;

  console.log(`  V5008:  ${v5008Passed}/${v5008Results.length} passed`);
  console.log(`  V6800:  ${v6800Passed}/${v6800Results.length} passed`);
  console.log();

  if (totalFailed === 0) {
    console.log(`${colors.green}${colors.bold}  ✓ ALL TESTS PASSED${colors.reset}`);
  } else {
    console.log(`${colors.red}${colors.bold}  ✗ ${totalFailed} TEST(S) FAILED${colors.reset}`);
  }

  console.log();
  console.log(
    `  Total:  ${totalPassed}/${totalTests} passed (${Math.round((totalPassed / totalTests) * 100)}%)`
  );
  console.log(
    `${colors.bold}═══════════════════════════════════════════════════════════${colors.reset}\n`
  );

  // Exit with error code if any tests failed
  process.exit(totalFailed > 0 ? 1 : 0);
}

// Run main
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
