/**
 * Database Schema
 *
 * MySQL schema for MQTT Middleware Pro
 * Run these migrations to create database tables
 */

export const migrations = {
  // Create database
  createDatabase: `
    CREATE DATABASE IF NOT EXISTS mqtt_middleware 
    CHARACTER SET utf8mb4 
    COLLATE utf8mb4_unicode_ci;
  `,

  // Use database
  useDatabase: `USE mqtt_middleware;`,

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

/**
 * Run all migrations
 */
export async function runMigrations(db: any): Promise<void> {
  console.log('Running database migrations...');
  
  // Create database
  await db.execute(migrations.createDatabase);
  await db.execute(migrations.useDatabase);
  
  // Create tables
  await db.execute(migrations.createSuoDevModTable);
  await db.execute(migrations.createSuoHeartbeatTable);
  await db.execute(migrations.createSuoRfidSnapshotTable);
  await db.execute(migrations.createSuoRfidEventTable);
  await db.execute(migrations.createSuoTempHumTable);
  await db.execute(migrations.createSuoNoiseLevelTable);
  await db.execute(migrations.createSuoDoorStateTable);
  await db.execute(migrations.createSuoCommandResultTable);
  
  console.log('Database migrations completed successfully');
}

/**
 * Get all migration SQL for manual execution
 */
export function getAllMigrationSQL(): string {
  return Object.values(migrations).join('\n\n');
}
