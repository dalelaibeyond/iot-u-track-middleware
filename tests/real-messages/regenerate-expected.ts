/**
 * Regenerate Expected Values
 *
 * Runs the actual parsers and outputs the correct expected SIF/SUO values
 * to update the markdown files with accurate expectations.
 *
 * Usage: npx tsx tests/real-messages/regenerate-expected.ts
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { V5008Parser } from '../../src/core/parser/v5008-parser';
import { V6800Parser } from '../../src/core/parser/v6800-parser';
import { V5008Normalizer } from '../../src/core/normalizer/v5008-normalizer';
import { V6800Normalizer } from '../../src/core/normalizer/v6800-normalizer';
import { RawMQTTMessage } from '../../src/core/parser/parser.interface';

interface TestCase {
  name: string;
  topic: string;
  rawInput: string;
  rawType: 'hex' | 'json';
}

function parseMarkdownFile(filePath: string, deviceType: 'V5008' | 'V6800'): TestCase[] {
  const content = readFileSync(filePath, 'utf-8');
  const testCases: TestCase[] = [];

  const testBlocks = content.split(/## Test Case \d+:/);

  for (const block of testBlocks) {
    if (!block.trim()) continue;

    const lines = block.trim().split('\n');
    const name = lines[0].trim();

    const topicMatch = block.match(/\*\*Topic:\*\*\s*(.+)/);
    const topic = topicMatch ? topicMatch[1].trim() : '';

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

    if (rawInput) {
      testCases.push({ name, topic, rawInput, rawType });
    }
  }

  return testCases;
}

async function processTestCases(deviceType: 'V5008' | 'V6800') {
  console.log(`\n${'='.repeat(60)}`);
  console.log(` ${deviceType} - ACTUAL OUTPUT`);
  console.log('='.repeat(60));

  const filePath = join(__dirname, `${deviceType.toLowerCase()}-msg-list.md`);
  const testCases = parseMarkdownFile(filePath, deviceType);

  for (const testCase of testCases) {
    console.log(`\n--- ${testCase.name} ---`);
    console.log(`Topic: ${testCase.topic}`);

    try {
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
      let sifMessage;
      if (deviceType === 'V5008') {
        const parser = new V5008Parser();
        sifMessage = await parser.parse(rawMessage);
      } else {
        const parser = new V6800Parser();
        sifMessage = await parser.parse(rawMessage);
      }

      // Clean SIF for display
      const sifClean = JSON.parse(JSON.stringify(sifMessage));
      if (sifClean.meta) {
        delete sifClean.meta.rawHex;
        delete sifClean.meta.rawType;
        delete sifClean.meta.topic;
      }

      console.log('\nSIF Output:');
      console.log(JSON.stringify(sifClean, null, 2));

      // Normalize
      let suoMessages;
      if (deviceType === 'V5008') {
        const normalizer = new V5008Normalizer();
        suoMessages = await normalizer.normalize(sifMessage);
      } else {
        const normalizer = new V6800Normalizer();
        suoMessages = await normalizer.normalize(sifMessage);
      }

      const suoArray = Array.isArray(suoMessages) ? suoMessages : [suoMessages];

      if (suoArray.length > 0) {
        const suoClean = JSON.parse(JSON.stringify(suoArray[0]));
        delete suoClean.serverTimestamp;
        delete suoClean.deviceTimestamp;

        console.log('\nSUO Output:');
        console.log(JSON.stringify(suoClean, null, 2));
      }
    } catch (error) {
      console.log(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

async function main() {
  await processTestCases('V5008');
  await processTestCases('V6800');
}

main().catch(console.error);
