/**
 * SUO Repository
 *
 * Single repository for all SUO message types (DRY principle)
 * Uses table mapping to route messages to correct tables
 */

import { Database } from './database';
import { Logger } from '../utils/logger';
import { AnySUOMessage, SUOMessage } from '../types/suo.types';

export class SUORepository {
  private db: Database;
  private logger: Logger;

  // Table mapping: SUO type -> database table name
  private tableMapping: Record<string, string> = {
    SUO_DEV_MOD: 'suo_dev_mod',
    SUO_HEARTBEAT: 'suo_heartbeat',
    SUO_RFID_SNAPSHOT: 'suo_rfid_snapshot',
    SUO_RFID_EVENT: 'suo_rfid_event',
    SUO_TEMP_HUM: 'suo_temp_hum',
    SUO_NOISE_LEVEL: 'suo_noise_level',
    SUO_DOOR_STATE: 'suo_door_state',
    SUO_COMMAND_RESULT: 'suo_command_result',
  };

  constructor(db: Database) {
    this.db = db;
    this.logger = new Logger('SUORepository');
  }

  /**
   * Format timestamp for MySQL DATETIME column
   * Converts ISO 8601 (2026-03-05T18:46:44.053Z) to MySQL format (2026-03-05 18:46:44.053)
   */
  private formatTimestamp(timestamp: string | Date | number): string {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return date.toISOString().replace('T', ' ').replace('Z', '');
  }

  /**
   * Save any SUO message to the database
   */
  async saveSUO(suo: AnySUOMessage): Promise<void> {
    const tableName = this.tableMapping[suo.suoType];

    if (!tableName) {
      throw new Error(`Unknown SUO type: ${suo.suoType}`);
    }

    try {
      switch (suo.suoType) {
        case 'SUO_DEV_MOD':
          await this.saveDevMod(suo as any);
          break;
        case 'SUO_HEARTBEAT':
          await this.saveHeartbeat(suo as any);
          break;
        case 'SUO_RFID_SNAPSHOT':
          await this.saveRfidSnapshot(suo as any);
          break;
        case 'SUO_RFID_EVENT':
          await this.saveRfidEvent(suo as any);
          break;
        case 'SUO_TEMP_HUM':
          await this.saveTempHum(suo as any);
          break;
        case 'SUO_NOISE_LEVEL':
          await this.saveNoiseLevel(suo as any);
          break;
        case 'SUO_DOOR_STATE':
          await this.saveDoorState(suo as any);
          break;
        case 'SUO_COMMAND_RESULT':
          await this.saveCommandResult(suo as any);
          break;
      }

      this.logger.debug(`Saved ${suo.suoType} to ${tableName}`);
    } catch (error) {
      this.logger.error(`Failed to save ${suo.suoType}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Save SUO_DEV_MOD (flattened structure)
   */
  private async saveDevMod(suo: any): Promise<void> {
    const sql = `
      INSERT INTO suo_dev_mod 
        (device_id, device_type, message_id, server_timestamp, 
         ip, mask, gw_ip, mac, model, fw_ver, modules_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db.execute(sql, [
      suo.deviceId,
      suo.deviceType,
      suo.messageId,
      this.formatTimestamp(suo.serverTimestamp),
      suo.ip,
      suo.mask,
      suo.gwIp,
      suo.mac,
      suo.model,
      suo.fwVer,
      JSON.stringify(suo.modules),
    ]);
  }

  /**
   * Save SUO_HEARTBEAT (flattened structure)
   */
  private async saveHeartbeat(suo: any): Promise<void> {
    const sql = `
      INSERT INTO suo_heartbeat 
        (device_id, device_type, message_id, server_timestamp,
         bus_voltage, bus_current, main_power, backup_power, modules_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db.execute(sql, [
      suo.deviceId,
      suo.deviceType,
      suo.messageId,
      this.formatTimestamp(suo.serverTimestamp),
      suo.meta?.busVoltage || null,
      suo.meta?.busCurrent || null,
      suo.meta?.mainPower || null,
      suo.meta?.backupPower || null,
      JSON.stringify(suo.modules),
    ]);
  }

  /**
   * Save SUO_RFID_SNAPSHOT
   */
  private async saveRfidSnapshot(suo: any): Promise<void> {
    const sql = `
      INSERT INTO suo_rfid_snapshot 
        (device_id, device_type, module_index, module_id, message_id, 
         server_timestamp, sensors_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db.execute(sql, [
      suo.deviceId,
      suo.deviceType,
      suo.moduleIndex,
      suo.moduleId,
      suo.messageId,
      this.formatTimestamp(suo.serverTimestamp),
      JSON.stringify(suo.data.sensors),
    ]);
  }

  /**
   * Save SUO_RFID_EVENT
   */
  private async saveRfidEvent(suo: any): Promise<void> {
    const sql = `
      INSERT INTO suo_rfid_event 
        (device_id, device_type, module_index, module_id, message_id,
         server_timestamp, events_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db.execute(sql, [
      suo.deviceId,
      suo.deviceType,
      suo.moduleIndex,
      suo.moduleId,
      suo.messageId,
      this.formatTimestamp(suo.serverTimestamp),
      JSON.stringify(suo.data.events),
    ]);
  }

  /**
   * Save SUO_TEMP_HUM
   */
  private async saveTempHum(suo: any): Promise<void> {
    const sql = `
      INSERT INTO suo_temp_hum 
        (device_id, device_type, module_index, module_id, message_id,
         server_timestamp, sensors_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db.execute(sql, [
      suo.deviceId,
      suo.deviceType,
      suo.moduleIndex,
      suo.moduleId,
      suo.messageId,
      this.formatTimestamp(suo.serverTimestamp),
      JSON.stringify(suo.data.sensors),
    ]);
  }

  /**
   * Save SUO_NOISE_LEVEL
   */
  private async saveNoiseLevel(suo: any): Promise<void> {
    const sql = `
      INSERT INTO suo_noise_level 
        (device_id, device_type, module_index, module_id, message_id,
         server_timestamp, sensors_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db.execute(sql, [
      suo.deviceId,
      suo.deviceType,
      suo.moduleIndex,
      suo.moduleId,
      suo.messageId,
      this.formatTimestamp(suo.serverTimestamp),
      JSON.stringify(suo.data.sensors),
    ]);
  }

  /**
   * Save SUO_DOOR_STATE
   */
  private async saveDoorState(suo: any): Promise<void> {
    const sql = `
      INSERT INTO suo_door_state 
        (device_id, device_type, module_index, module_id, message_id,
         server_timestamp, door1_state, door2_state)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db.execute(sql, [
      suo.deviceId,
      suo.deviceType,
      suo.moduleIndex,
      suo.moduleId,
      suo.messageId,
      this.formatTimestamp(suo.serverTimestamp),
      suo.door1State,
      suo.door2State,
    ]);
  }

  /**
   * Save SUO_COMMAND_RESULT
   */
  private async saveCommandResult(suo: any): Promise<void> {
    const sql = `
      INSERT INTO suo_command_result 
        (device_id, device_type, module_index, module_id, message_id,
         server_timestamp, command_type, result, original_req, color_codes_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db.execute(sql, [
      suo.deviceId,
      suo.deviceType,
      suo.moduleIndex,
      suo.moduleId,
      suo.messageId,
      this.formatTimestamp(suo.serverTimestamp),
      suo.data.commandType,
      suo.data.result,
      suo.data.originalReq,
      suo.data.colorCodes ? JSON.stringify(suo.data.colorCodes) : null,
    ]);
  }

  /**
   * Query device history
   */
  async queryDeviceHistory(deviceId: string, suoType: string, limit: number = 100): Promise<any[]> {
    const tableName = this.tableMapping[suoType];

    if (!tableName) {
      throw new Error(`Unknown SUO type: ${suoType}`);
    }

    const sql = `SELECT * FROM ${tableName} WHERE device_id = ? ORDER BY server_timestamp DESC LIMIT ?`;
    return await this.db.query(sql, [deviceId, limit]);
  }

  /**
   * Query module history
   */
  async queryModuleHistory(
    deviceId: string,
    moduleIndex: number,
    suoType: string,
    limit: number = 100
  ): Promise<any[]> {
    const tableName = this.tableMapping[suoType];

    if (!tableName) {
      throw new Error(`Unknown SUO type: ${suoType}`);
    }

    const sql = `
      SELECT * FROM ${tableName} 
      WHERE device_id = ? AND module_index = ? 
      ORDER BY server_timestamp DESC 
      LIMIT ?
    `;
    return await this.db.query(sql, [deviceId, moduleIndex, limit]);
  }

  /**
   * Get latest message for a device
   */
  async getLatestMessage(deviceId: string, suoType: string): Promise<any | null> {
    const tableName = this.tableMapping[suoType];

    if (!tableName) {
      throw new Error(`Unknown SUO type: ${suoType}`);
    }

    const sql = `SELECT * FROM ${tableName} WHERE device_id = ? ORDER BY server_timestamp DESC LIMIT 1`;
    const results = await this.db.query(sql, [deviceId]);
    return results.length > 0 ? results[0] : null;
  }
}
