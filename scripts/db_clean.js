#!/usr/bin/env node

/**
 * Database Cleanup Script
 *
 * WARNING: This script will DELETE ALL DATA in the MQTT Middleware database!
 * 
 * Usage:
 *   npm run db:clean          # Interactive mode (asks for confirmation)
 *   node scripts/db_clean.js --force    # Skip confirmation
 *   node scripts/db_clean.js --tables-only    # Only drop tables, keep database
 */

import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import readline from 'readline';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Parse command line arguments
const args = process.argv.slice(2);
const forceMode = args.includes('--force') || args.includes('-f');
const tablesOnly = args.includes('--tables-only') || args.includes('-t');
const helpMode = args.includes('--help') || args.includes('-h');

// Show help
if (helpMode) {
  console.log(`
Database Cleanup Script for MQTT Middleware Pro

WARNING: This script permanently deletes all data!

Usage:
  node scripts/db_clean.js [options]

Options:
  --force, -f        Skip confirmation prompt (dangerous!)
  --tables-only, -t  Only drop tables, keep database
  --help, -h         Show this help message

Examples:
  # Interactive mode (asks for confirmation)
  node scripts/db_clean.js

  # Automated cleanup (for CI/CD)
  node scripts/db_clean.js --force

  # Only drop tables, keep database
  node scripts/db_clean.js --tables-only
`);
  process.exit(0);
}

// Database configuration from environment
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mqtt_middleware',
};

// Tables to drop (in reverse order of dependencies)
const tables = [
  'suo_command_result',
  'suo_door_state',
  'suo_noise_level',
  'suo_temp_hum',
  'suo_rfid_event',
  'suo_rfid_snapshot',
  'suo_heartbeat',
  'suo_dev_mod',
];

async function checkDatabaseExists(connection, dbName) {
  const [rows] = await connection.execute(
    'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?',
    [dbName]
  );
  return rows.length > 0;
}

async function getTableRecordCounts(connection, dbName) {
  const counts = {};
  for (const table of tables) {
    try {
      const [rows] = await connection.execute(
        `SELECT COUNT(*) as count FROM \`${dbName}\`.\`${table}\``
      );
      counts[table] = rows[0].count;
    } catch (error) {
      counts[table] = 0; // Table doesn't exist
    }
  }
  return counts;
}

async function promptConfirmation(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

async function cleanDatabase() {
  let connection;

  try {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║              ⚠️  DATABASE CLEANUP SCRIPT  ⚠️                  ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log('');

    if (!forceMode) {
      console.log('WARNING: This will PERMANENTLY DELETE all data!');
      console.log('');
    }

    console.log('Database Configuration:');
    console.log(`  Host: ${dbConfig.host}`);
    console.log(`  Port: ${dbConfig.port}`);
    console.log(`  Database: ${dbConfig.database}`);
    console.log(`  User: ${dbConfig.user}`);
    console.log('');

    // Connect to MySQL
    console.log('Connecting to MySQL...');
    connection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
    });
    console.log('Connected successfully!');
    console.log('');

    // Check if database exists
    const dbExists = await checkDatabaseExists(connection, dbConfig.database);
    
    if (!dbExists) {
      console.log(`Database '${dbConfig.database}' does not exist.`);
      console.log('Nothing to clean.');
      console.log('');
      console.log('✅ Cleanup completed (nothing to delete)');
      return;
    }

    // Get record counts
    console.log('Analyzing database contents...');
    const counts = await getTableRecordCounts(connection, dbConfig.database);
    const totalRecords = Object.values(counts).reduce((a, b) => a + b, 0);

    console.log('');
    console.log('Database contents:');
    console.log('─────────────────────────────────────────');
    for (const [table, count] of Object.entries(counts)) {
      const status = count > 0 ? `${count} records` : 'empty';
      console.log(`  ${table.padEnd(25)} ${status}`);
    }
    console.log('─────────────────────────────────────────');
    console.log(`  TOTAL RECORDS: ${totalRecords}`);
    console.log('');

    // Confirm deletion
    if (!forceMode) {
      const message = tablesOnly 
        ? 'Type "yes" to drop all tables: '
        : `Type "yes" to DROP DATABASE '${dbConfig.database}': `;
      
      const confirmed = await promptConfirmation(message);
      
      if (!confirmed) {
        console.log('');
        console.log('❌ Cleanup cancelled by user');
        return;
      }
      console.log('');
    }

    // Start cleanup
    console.log('Starting cleanup...');
    console.log('');

    // Drop tables
    console.log('Dropping tables...');
    for (const table of tables) {
      try {
        await connection.execute(`DROP TABLE IF EXISTS \`${dbConfig.database}\`.\`${table}\``);
        console.log(`  ✓ Dropped table: ${table}`);
      } catch (error) {
        console.log(`  ⚠ Failed to drop table: ${table} (${error.message})`);
      }
    }
    console.log('');

    // Drop database (unless --tables-only)
    if (!tablesOnly) {
      console.log('Dropping database...');
      try {
        await connection.execute(`DROP DATABASE IF EXISTS \`${dbConfig.database}\``);
        console.log(`  ✓ Dropped database: ${dbConfig.database}`);
      } catch (error) {
        console.log(`  ⚠ Failed to drop database: ${error.message}`);
      }
      console.log('');
    }

    // Summary
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║              ✅ CLEANUP COMPLETED SUCCESSFULLY                ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('Deleted:');
    console.log(`  - ${tables.length} tables`);
    console.log(`  - ${totalRecords} records`);
    if (!tablesOnly) {
      console.log(`  - 1 database (${dbConfig.database})`);
    }
    console.log('');
    console.log('Next steps:');
    if (tablesOnly) {
      console.log(`  Run 'npm run db:migrate' to recreate tables`);
    } else {
      console.log(`  Run 'npm run db:migrate' to recreate database and tables`);
    }
    console.log('');

  } catch (error) {
    console.error('');
    console.error('╔═══════════════════════════════════════════════════════════════╗');
    console.error('║              ❌ CLEANUP FAILED                                ║');
    console.error('╚═══════════════════════════════════════════════════════════════╝');
    console.error('');
    console.error('Error:', error.message);
    console.error('');
    console.error('Troubleshooting:');
    console.error('  1. Ensure MySQL is running');
    console.error('  2. Check database credentials in .env file');
    console.error('  3. Verify you have DROP privileges');
    console.error('');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('');
  console.log('');
  console.log('❌ Cleanup cancelled');
  process.exit(0);
});

// Run cleanup
cleanDatabase();
