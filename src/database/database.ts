/**
 * Database Connection
 *
 * MySQL connection pool management
 */

import mysql2 from 'mysql2/promise';
import { Logger } from '../utils/logger';

export interface DatabaseConfig {
  enabled: boolean;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  connectionLimit: number;
}

export class Database {
  private pool: mysql2.Pool | null = null;
  private config: DatabaseConfig;
  private logger: Logger;
  private isConnected: boolean = false;

  constructor(config: DatabaseConfig) {
    this.config = config;
    this.logger = new Logger('Database');
  }

  /**
   * Connect to database
   */
  async connect(): Promise<void> {
    if (!this.config.enabled) {
      this.logger.info('Database is disabled');
      return;
    }

    if (this.pool) {
      this.logger.warn('Database already connected');
      return;
    }

    try {
      this.logger.info(
        `Connecting to MySQL: ${this.config.host}:${this.config.port}/${this.config.database}`
      );

      this.pool = mysql2.createPool({
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.username,
        password: this.config.password,
        connectionLimit: this.config.connectionLimit,
        waitForConnections: true,
        queueLimit: 0,
      });

      // Test connection
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();

      this.isConnected = true;
      this.logger.info('Database connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect to database', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    if (!this.pool) {
      return;
    }

    this.logger.info('Disconnecting from database...');

    try {
      await this.pool.end();
      this.pool = null;
      this.isConnected = false;
      this.logger.info('Database disconnected');
    } catch (error) {
      this.logger.error('Error disconnecting from database', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Execute a query
   */
  async query(sql: string, params?: unknown[]): Promise<mysql2.RowDataPacket[]> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }

    try {
      const [rows] = await this.pool.execute(sql, params as any);
      return rows as mysql2.RowDataPacket[];
    } catch (error) {
      this.logger.error('Query failed', {
        sql,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Execute an insert/update/delete
   */
  async execute(sql: string, params?: unknown[]): Promise<mysql2.ResultSetHeader> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }

    try {
      const [result] = await this.pool.execute(sql, params as any);
      return result as mysql2.ResultSetHeader;
    } catch (error) {
      this.logger.error('Execute failed', {
        sql,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Begin transaction
   */
  async beginTransaction(): Promise<mysql2.PoolConnection> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }

    const connection = await this.pool.getConnection();
    await connection.beginTransaction();
    return connection;
  }

  /**
   * Commit transaction
   */
  async commitTransaction(connection: mysql2.PoolConnection): Promise<void> {
    await connection.commit();
    connection.release();
  }

  /**
   * Rollback transaction
   */
  async rollbackTransaction(connection: mysql2.PoolConnection): Promise<void> {
    await connection.rollback();
    connection.release();
  }

  /**
   * Check if connected
   */
  isDatabaseConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get pool stats
   */
  getStats() {
    if (!this.pool) {
      return { totalConnections: 0, activeConnections: 0, idleConnections: 0 };
    }

    // mysql2 doesn't expose pool stats directly, so we return what we can
    return {
      connected: this.isConnected,
      connectionLimit: this.config.connectionLimit,
    };
  }
}

// Export singleton instance creator
export function createDatabase(config: DatabaseConfig): Database {
  return new Database(config);
}
