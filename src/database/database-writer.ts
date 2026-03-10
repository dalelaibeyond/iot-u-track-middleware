/**
 * Database Writer Module
 *
 * Listens to SUO messages and persists them to the database
 * Configurable with batching and retry logic
 */

import { eventBus, SystemEvents } from '../core/event-bus';
import { Database } from './database';
import { SUORepository } from './suo-repository';
import { Logger } from '../utils/logger';
import { SUOMessageEvent } from '../types/event.types';
import { AnySUOMessage } from '../types/suo.types';

export interface DatabaseWriterConfig {
  enabled: boolean;
  batchSize: number;
  maxQueueSize: number;
  retryCount: number;
  queueTimeout: number;
}

export class DatabaseWriter {
  private config: DatabaseWriterConfig;
  private db: Database;
  private repository: SUORepository;
  private logger: Logger;
  private isRunning: boolean = false;
  private messageQueue: AnySUOMessage[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private retryAttempts: Map<string, number> = new Map();

  constructor(config: DatabaseWriterConfig, db: Database) {
    this.config = config;
    this.db = db;
    this.repository = new SUORepository(db);
    this.logger = new Logger('DatabaseWriter');
  }

  /**
   * Start the database writer
   */
  start(): void {
    if (this.isRunning) {
      this.logger.warn('DatabaseWriter is already running');
      return;
    }

    if (!this.config.enabled) {
      this.logger.info('DatabaseWriter is disabled');
      return;
    }

    this.logger.info('Starting DatabaseWriter...');

    // Subscribe to SUO messages
    eventBus.on<SUOMessageEvent>(SystemEvents.SUO_MQTT_MESSAGE, this.handleSUOMessage.bind(this));

    this.isRunning = true;
    this.logger.info('DatabaseWriter started');
  }

  /**
   * Stop the database writer
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('Stopping DatabaseWriter...');

    // Unsubscribe from events
    eventBus.off<SUOMessageEvent>(SystemEvents.SUO_MQTT_MESSAGE, this.handleSUOMessage.bind(this));

    // Clear batch timeout
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    // Flush remaining messages
    if (this.messageQueue.length > 0) {
      await this.flushBatch();
    }

    this.isRunning = false;
    this.logger.info('DatabaseWriter stopped');
  }

  /**
   * Handle incoming SUO messages
   */
  private handleSUOMessage(event: SUOMessageEvent): void {
    if (!this.db.isDatabaseConnected()) {
      this.logger.warn('Database not connected, dropping message');
      return;
    }

    const message = event.message as AnySUOMessage;

    // Check queue size (backpressure)
    if (this.messageQueue.length >= this.config.maxQueueSize) {
      this.logger.warn('Message queue full, dropping oldest message');
      this.messageQueue.shift();
    }

    // Add to queue
    this.messageQueue.push(message);

    // Check if we should flush
    if (this.messageQueue.length >= this.config.batchSize) {
      this.flushBatch();
    } else {
      // Schedule batch flush
      this.scheduleBatchFlush();
    }
  }

  /**
   * Schedule batch flush after timeout
   */
  private scheduleBatchFlush(): void {
    if (this.batchTimeout) {
      return; // Already scheduled
    }

    this.batchTimeout = setTimeout(() => {
      this.batchTimeout = null;
      if (this.messageQueue.length > 0) {
        this.flushBatch();
      }
    }, this.config.queueTimeout);
  }

  /**
   * Flush batch of messages to database
   */
  private async flushBatch(): Promise<void> {
    if (this.messageQueue.length === 0) {
      return;
    }

    const batch = [...this.messageQueue];
    this.messageQueue = [];

    // Clear batch timeout
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    try {
      // Save each message in the batch
      for (const message of batch) {
        await this.saveMessageWithRetry(message);
      }

      this.logger.debug(`Flushed ${batch.length} messages to database`);
    } catch (error) {
      this.logger.error('Failed to flush batch', {
        error: error instanceof Error ? error.message : String(error),
        batchSize: batch.length,
      });

      // Re-queue messages for retry
      if (this.messageQueue.length + batch.length <= this.config.maxQueueSize) {
        this.messageQueue.unshift(...batch);
      }
    }
  }

  /**
   * Save message with retry logic
   */
  private async saveMessageWithRetry(message: AnySUOMessage): Promise<void> {
    const messageKey = `${message.suoType}:${message.deviceId}:${message.messageId}`;
    let attempts = this.retryAttempts.get(messageKey) || 0;

    while (attempts < this.config.retryCount) {
      try {
        await this.repository.saveSUO(message);
        this.retryAttempts.delete(messageKey);
        return;
      } catch (error) {
        attempts++;
        this.retryAttempts.set(messageKey, attempts);

        if (attempts >= this.config.retryCount) {
          this.logger.error(`Failed to save message after ${attempts} attempts`, {
            messageKey,
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }

        // Wait before retry
        await this.sleep(1000 * attempts);
      }
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Force flush queue (for graceful shutdown)
   */
  async forceFlush(): Promise<void> {
    if (this.messageQueue.length > 0) {
      this.logger.info(`Force flushing ${this.messageQueue.length} messages`);
      await this.flushBatch();
    }
  }

  /**
   * Get queue stats
   */
  getStats() {
    return {
      queueSize: this.messageQueue.length,
      maxQueueSize: this.config.maxQueueSize,
      batchSize: this.config.batchSize,
      isRunning: this.isRunning,
    };
  }

  /**
   * Check if running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get config
   */
  getConfig(): DatabaseWriterConfig {
    return { ...this.config };
  }

  /**
   * Update config
   */
  updateConfig(config: Partial<DatabaseWriterConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.info('DatabaseWriter configuration updated');
  }
}
