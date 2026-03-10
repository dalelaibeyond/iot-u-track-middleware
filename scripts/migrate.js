#!/usr/bin/env node

/**
 * Database Migration Script
 *
 * Run this script to create database tables for MQTT Middleware Pro
 *
 * Usage:
 *   npm run db:migrate
 *   # or
 *   node scripts/migrate.js
 */

import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Database configuration from environment
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mqtt_middleware',
};

// SQL Migrations - note: no 'USE database' statement, we connect directly instead
const migrations = {
  // Create database
  createDatabase: `
    CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\`
    CHARACTER SET utf8mb4 
    COLLATE utf8mb4_unicode_ci;
  `,

  // SUO_DEV_MOD table
  createSuoDevModTable: `
    CREATE TABLE IF NOT EXISTS suo_dev_mod (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      device_id VARCHAR(50) NOT NULL,
      device_type VARCHAR(10) NOT NULL,
      message_id VARCHAR(100) NOT NULL,
      server_timestamp DATETIME(3) NOT NULL,
      ip VARCHAR(15) NULL,
      mask VARCHAR(15) NULL,
      gw_ip VARCHAR(15) NULL,
      mac VARCHAR(17) NULL,
      model VARCHAR(50) NULL,
      fw_ver VARCHAR(50) NULL,
      modules_json JSON NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_device_id (device_id),
      INDEX idx_server_timestamp (server_timestamp),
      INDEX idx_device_timestamp (device_id, server_timestamp)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,

  // SUO_HEARTBEAT table
  createSuoHeartbeatTable: `
    CREATE TABLE IF NOT EXISTS suo_heartbeat (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      device_id VARCHAR(50) NOT NULL,
      device_type VARCHAR(10) NOT NULL,
      message_id VARCHAR(100) NOT NULL,
      server_timestamp DATETIME(3) NOT NULL,
      bus_voltage VARCHAR(10) NULL,
      bus_current VARCHAR(10) NULL,
      main_power TINYINT NULL,
      backup_power TINYINT NULL,
      modules_json JSON NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_device_id (device_id),
      INDEX idx_server_timestamp (server_timestamp),
      INDEX idx_device_timestamp (device_id, server_timestamp)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,

  // SUO_RFID_SNAPSHOT table
  createSuoRfidSnapshotTable: `
    CREATE TABLE IF NOT EXISTS suo_rfid_snapshot (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      device_id VARCHAR(50) NOT NULL,
      device_type VARCHAR(10) NOT NULL,
      module_index INT NOT NULL,
      module_id VARCHAR(50) NOT NULL,
      message_id VARCHAR(100) NOT NULL,
      server_timestamp DATETIME(3) NOT NULL,
      sensors_json JSON NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_device_id (device_id),
      INDEX idx_module (device_id, module_index),
      INDEX idx_server_timestamp (server_timestamp),
      INDEX idx_device_timestamp (device_id, server_timestamp)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,

  // SUO_RFID_EVENT table
  createSuoRfidEventTable: `
    CREATE TABLE IF NOT EXISTS suo_rfid_event (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      device_id VARCHAR(50) NOT NULL,
      device_type VARCHAR(10) NOT NULL,
      module_index INT NOT NULL,
      module_id VARCHAR(50) NOT NULL,
      message_id VARCHAR(100) NOT NULL,
      server_timestamp DATETIME(3) NOT NULL,
      events_json JSON NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_device_id (device_id),
      INDEX idx_module (device_id, module_index),
      INDEX idx_server_timestamp (server_timestamp),
      INDEX idx_device_timestamp (device_id, server_timestamp)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,

  // SUO_TEMP_HUM table
  createSuoTempHumTable: `
    CREATE TABLE IF NOT EXISTS suo_temp_hum (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      device_id VARCHAR(50) NOT NULL,
      device_type VARCHAR(10) NOT NULL,
      module_index INT NOT NULL,
      module_id VARCHAR(50) NOT NULL,
      message_id VARCHAR(100) NOT NULL,
      server_timestamp DATETIME(3) NOT NULL,
      sensors_json JSON NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_device_id (device_id),
      INDEX idx_module (device_id, module_index),
      INDEX idx_server_timestamp (server_timestamp),
      INDEX idx_device_timestamp (device_id, server_timestamp)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,

  // SUO_NOISE_LEVEL table
  createSuoNoiseLevelTable: `
    CREATE TABLE IF NOT EXISTS suo_noise_level (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      device_id VARCHAR(50) NOT NULL,
      device_type VARCHAR(10) NOT NULL,
      module_index INT NOT NULL,
      module_id VARCHAR(50) NOT NULL,
      message_id VARCHAR(100) NOT NULL,
      server_timestamp DATETIME(3) NOT NULL,
      sensors_json JSON NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_device_id (device_id),
      INDEX idx_module (device_id, module_index),
      INDEX idx_server_timestamp (server_timestamp),
      INDEX idx_device_timestamp (device_id, server_timestamp)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,

  // SUO_DOOR_STATE table
  createSuoDoorStateTable: `
    CREATE TABLE IF NOT EXISTS suo_door_state (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      device_id VARCHAR(50) NOT NULL,
      device_type VARCHAR(10) NOT NULL,
      module_index INT NOT NULL,
      module_id VARCHAR(50) NULL,
      message_id VARCHAR(100) NOT NULL,
      server_timestamp DATETIME(3) NOT NULL,
      door1_state TINYINT NULL,
      door2_state TINYINT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_device_id (device_id),
      INDEX idx_module (device_id, module_index),
      INDEX idx_server_timestamp (server_timestamp),
      INDEX idx_device_timestamp (device_id, server_timestamp)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,

  // SUO_COMMAND_RESULT table
  createSuoCommandResultTable: `
    CREATE TABLE IF NOT EXISTS suo_command_result (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      device_id VARCHAR(50) NOT NULL,
      device_type VARCHAR(10) NOT NULL,
      module_index INT NOT NULL,
      module_id VARCHAR(50) NOT NULL,
      message_id VARCHAR(100) NOT NULL,
      server_timestamp DATETIME(3) NOT NULL,
      command_type VARCHAR(50) NOT NULL,
      result VARCHAR(20) NOT NULL,
      original_req VARCHAR(100) NULL,
      color_codes_json JSON NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_device_id (device_id),
      INDEX idx_module (device_id, module_index),
      INDEX idx_server_timestamp (server_timestamp),
      INDEX idx_device_timestamp (device_id, server_timestamp)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,
};

async function runMigrations() {
  let connection;
  let dbConnection;

  try {
    console.log('===========================================');
    console.log('MQTT Middleware Pro - Database Migration');
    console.log('===========================================');
    console.log('');
    console.log('Database Configuration:');
    console.log(`  Host: ${dbConfig.host}`);
    console.log(`  Port: ${dbConfig.port}`);
    console.log(`  Database: ${dbConfig.database}`);
    console.log(`  User: ${dbConfig.user}`);
    console.log('');

    // Step 1: Connect to MySQL (without database first)
    console.log('Connecting to MySQL...');
    connection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
    });
    console.log('Connected successfully!');
    console.log('');

    // Step 2: Create database
    console.log('Creating database if not exists...');
    await connection.execute(migrations.createDatabase);
    console.log('✓ Database created/verified');
    console.log('');

    // Step 3: Close initial connection
    await connection.end();

    // Step 4: Connect to the specific database
    console.log(`Connecting to database '${dbConfig.database}'...`);
    dbConnection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
    });
    console.log('Connected to database!');
    console.log('');

    // Step 5: Create tables
    console.log('Creating tables...');
    const tables = [
      { name: 'suo_dev_mod', sql: migrations.createSuoDevModTable },
      { name: 'suo_heartbeat', sql: migrations.createSuoHeartbeatTable },
      { name: 'suo_rfid_snapshot', sql: migrations.createSuoRfidSnapshotTable },
      { name: 'suo_rfid_event', sql: migrations.createSuoRfidEventTable },
      { name: 'suo_temp_hum', sql: migrations.createSuoTempHumTable },
      { name: 'suo_noise_level', sql: migrations.createSuoNoiseLevelTable },
      { name: 'suo_door_state', sql: migrations.createSuoDoorStateTable },
      { name: 'suo_command_result', sql: migrations.createSuoCommandResultTable },
    ];

    for (const table of tables) {
      await dbConnection.execute(table.sql);
      console.log(`  ✓ ${table.name}`);
    }

    console.log('');
    console.log('===========================================');
    console.log('✅ Database migration completed successfully!');
    console.log('===========================================');
    console.log('');
    console.log('Created tables:');
    tables.forEach(t => console.log(`  - ${t.name}`));
    console.log('');

  } catch (error) {
    console.error('');
    console.error('===========================================');
    console.error('❌ Database migration failed!');
    console.error('===========================================');
    console.error('');
    console.error('Error:', error.message);
    console.error('');
    console.error('Troubleshooting:');
    console.error('  1. Ensure MySQL is running');
    console.error('  2. Check database credentials in .env file');
    console.error('  3. Verify network connectivity to MySQL server');
    console.error('');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end().catch(() => {});
    }
    if (dbConnection) {
      await dbConnection.end().catch(() => {});
    }
  }
}

// Run migrations
runMigrations();
