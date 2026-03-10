/**
 * Webhook Dispatcher Module
 *
 * Dispatches SUO messages to HTTP endpoints via POST requests.
 * Supports multiple endpoints, filtering, retry logic, and batching.
 */

import { eventBus, SystemEvents } from '../core/event-bus';
import { Logger } from '../utils/logger';
import { SUOMessageEvent } from '../types/event.types';
import { AnySUOMessage, SUOType } from '../types/suo.types';

export interface WebhookEndpoint {
  id: string;
  url: string;
  enabled: boolean;
  secret?: string;
  headers?: Record<string, string>;
  filter?: {
    deviceIds?: string[];
    deviceTypes?: string[];
    suoTypes?: SUOType[];
  };
  retryConfig: {
    maxRetries: number;
    retryDelay: number;
    timeout: number;
  };
  batchConfig?: {
    enabled: boolean;
    maxSize: number;
    flushInterval: number;
  };
}

export interface WebhookDispatcherConfig {
  enabled: boolean;
  endpoints: WebhookEndpoint[];
  defaultRetryConfig: {
    maxRetries: number;
    retryDelay: number;
    timeout: number;
  };
  maxConcurrentRequests: number;
}

export interface WebhookStatus {
  enabled: boolean;
  endpoints: Array<{
    id: string;
    url: string;
    enabled: boolean;
    messagesSent: number;
    messagesFailed: number;
    lastError?: string;
    lastSuccessAt?: Date;
  }>;
  queueSize: number;
  isProcessing: boolean;
}

interface QueuedMessage {
  id: string;
  endpointId: string;
  message: AnySUOMessage;
  attempts: number;
  createdAt: Date;
}

interface BatchBuffer {
  endpointId: string;
  messages: AnySUOMessage[];
  timer?: NodeJS.Timeout;
}

/**
 * Webhook Dispatcher
 * Dispatches SUO messages to HTTP endpoints
 */
export class WebhookDispatcher {
  private config: WebhookDispatcherConfig;
  private logger: Logger;
  private isRunning: boolean = false;
  private messageQueue: QueuedMessage[];
  private batchBuffers: Map<string, BatchBuffer>;
  private status: Map<
    string,
    { messagesSent: number; messagesFailed: number; lastError?: string; lastSuccessAt?: Date }
  >;
  private processingInterval: NodeJS.Timeout | null = null;
  private activeRequests: number = 0;

  constructor(config: WebhookDispatcherConfig) {
    this.config = config;
    this.logger = new Logger('WebhookDispatcher');
    this.messageQueue = [];
    this.batchBuffers = new Map();
    this.status = new Map();

    // Initialize status for each endpoint
    for (const endpoint of config.endpoints) {
      this.status.set(endpoint.id, {
        messagesSent: 0,
        messagesFailed: 0,
      });
    }
  }

  /**
   * Start the Webhook Dispatcher
   */
  start(): void {
    if (this.isRunning) {
      this.logger.warn('Webhook Dispatcher is already running');
      return;
    }

    if (!this.config.enabled) {
      this.logger.info('Webhook Dispatcher is disabled');
      return;
    }

    this.logger.info('Starting Webhook Dispatcher...');

    // Subscribe to SUO messages
    eventBus.on<SUOMessageEvent>(SystemEvents.SUO_MQTT_MESSAGE, this.handleAnySUOMessage.bind(this));

    // Start processing queue
    this.processingInterval = setInterval(this.processQueue.bind(this), 1000);

    this.isRunning = true;
    this.logger.info(`Webhook Dispatcher started with ${this.config.endpoints.length} endpoints`);
  }

  /**
   * Stop the Webhook Dispatcher
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('Stopping Webhook Dispatcher...');

    // Unsubscribe from events
    eventBus.off<SUOMessageEvent>(SystemEvents.SUO_MQTT_MESSAGE, this.handleAnySUOMessage.bind(this));

    // Stop processing interval
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    // Flush all batch buffers
    await this.flushAllBatches();

    // Wait for active requests to complete
    while (this.activeRequests > 0) {
      this.logger.debug(`Waiting for ${this.activeRequests} active requests...`);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.isRunning = false;
    this.logger.info('Webhook Dispatcher stopped');
  }

  /**
   * Handle SUO messages and queue them for dispatch
   */
  private handleAnySUOMessage(event: SUOMessageEvent): void {
    const message = event.message;

    for (const endpoint of this.config.endpoints) {
      if (!endpoint.enabled) continue;
      if (!this.shouldSendToEndpoint(message, endpoint)) continue;

      if (endpoint.batchConfig?.enabled) {
        this.addToBatch(endpoint, message);
      } else {
        this.queueMessage(endpoint.id, message);
      }
    }
  }

  /**
   * Check if message should be sent to endpoint based on filters
   */
  private shouldSendToEndpoint(message: AnySUOMessage, endpoint: WebhookEndpoint): boolean {
    const filter = endpoint.filter;
    if (!filter) return true;

    // Check device ID filter
    if (filter.deviceIds && filter.deviceIds.length > 0) {
      if (!filter.deviceIds.includes(message.deviceId)) {
        return false;
      }
    }

    // Check device type filter
    if (filter.deviceTypes && filter.deviceTypes.length > 0) {
      if (!filter.deviceTypes.includes(message.deviceType)) {
        return false;
      }
    }

    // Check SUO type filter
    if (filter.suoTypes && filter.suoTypes.length > 0) {
      if (!filter.suoTypes.includes(message.suoType)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Add message to batch buffer
   */
  private addToBatch(endpoint: WebhookEndpoint, message: AnySUOMessage): void {
    let buffer = this.batchBuffers.get(endpoint.id);

    if (!buffer) {
      buffer = {
        endpointId: endpoint.id,
        messages: [],
      };
      this.batchBuffers.set(endpoint.id, buffer);
    }

    buffer.messages.push(message);

    // Set flush timer if not already set
    if (!buffer.timer && endpoint.batchConfig) {
      buffer.timer = setTimeout(() => {
        this.flushBatch(endpoint.id);
      }, endpoint.batchConfig.flushInterval);
    }

    // Flush immediately if batch is full
    if (endpoint.batchConfig && buffer.messages.length >= endpoint.batchConfig.maxSize) {
      this.flushBatch(endpoint.id);
    }
  }

  /**
   * Flush batch buffer for an endpoint
   */
  private async flushBatch(endpointId: string): Promise<void> {
    const buffer = this.batchBuffers.get(endpointId);
    if (!buffer || buffer.messages.length === 0) return;

    // Clear timer
    if (buffer.timer) {
      clearTimeout(buffer.timer);
      buffer.timer = undefined;
    }

    // Get messages and clear buffer
    const messages = [...buffer.messages];
    buffer.messages = [];

    // Queue batched messages
    this.queueMessage(endpointId, messages as unknown as AnySUOMessage, true);
  }

  /**
   * Flush all batch buffers
   */
  private async flushAllBatches(): Promise<void> {
    for (const endpointId of this.batchBuffers.keys()) {
      await this.flushBatch(endpointId);
    }
  }

  /**
   * Queue message for delivery
   */
  private queueMessage(endpointId: string, message: AnySUOMessage, isBatch: boolean = false): void {
    const queuedMessage: QueuedMessage = {
      id: this.generateMessageId(),
      endpointId,
      message,
      attempts: 0,
      createdAt: new Date(),
    };

    this.messageQueue.push(queuedMessage);

    this.logger.debug(`Message queued for endpoint: ${endpointId}`, {
      isBatch,
      queueSize: this.messageQueue.length,
    });
  }

  /**
   * Process the message queue
   */
  private async processQueue(): Promise<void> {
    if (this.activeRequests >= this.config.maxConcurrentRequests) {
      return;
    }

    while (
      this.messageQueue.length > 0 &&
      this.activeRequests < this.config.maxConcurrentRequests
    ) {
      const queuedMessage = this.messageQueue.shift();
      if (!queuedMessage) continue;

      this.activeRequests++;
      this.sendMessage(queuedMessage).finally(() => {
        this.activeRequests--;
      });
    }
  }

  /**
   * Send message to webhook endpoint
   */
  private async sendMessage(queuedMessage: QueuedMessage): Promise<void> {
    const endpoint = this.config.endpoints.find(e => e.id === queuedMessage.endpointId);
    if (!endpoint) return;

    const endpointStatus = this.status.get(endpoint.id)!;
    const retryConfig = endpoint.retryConfig || this.config.defaultRetryConfig;

    try {
      const payload = this.buildPayload(queuedMessage.message, endpoint);
      const headers = this.buildHeaders(endpoint, payload);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), retryConfig.timeout);

      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers,
        body: payload,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        endpointStatus.messagesSent++;
        endpointStatus.lastSuccessAt = new Date();
        this.logger.debug(`Message sent to webhook: ${endpoint.id}`, {
          status: response.status,
        });
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      endpointStatus.messagesFailed++;
      endpointStatus.lastError = errorMessage;

      // Retry if attempts remaining
      if (queuedMessage.attempts < retryConfig.maxRetries) {
        queuedMessage.attempts++;
        this.logger.warn(
          `Retrying message to ${endpoint.id} (${queuedMessage.attempts}/${retryConfig.maxRetries})`
        );

        // Delay retry
        await new Promise(resolve => setTimeout(resolve, retryConfig.retryDelay));
        this.messageQueue.push(queuedMessage);
      } else {
        this.logger.error(`Failed to send message to webhook: ${endpoint.id}`, {
          error: errorMessage,
          attempts: queuedMessage.attempts,
        });
      }
    }
  }

  /**
   * Build request payload
   */
  private buildPayload(message: AnySUOMessage, endpoint: WebhookEndpoint): string {
    const payload = {
      event: 'suo.message',
      timestamp: new Date().toISOString(),
      data: message,
    };

    return JSON.stringify(payload);
  }

  /**
   * Build request headers
   */
  private buildHeaders(endpoint: WebhookEndpoint, payload: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'MQTT-Middleware-Pro/1.0',
      ...endpoint.headers,
    };

    // Add signature if secret is configured
    if (endpoint.secret) {
      const crypto = require('crypto');
      const signature = crypto.createHmac('sha256', endpoint.secret).update(payload).digest('hex');
      headers['X-Webhook-Signature'] = `sha256=${signature}`;
    }

    return headers;
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `wh-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get dispatcher status
   */
  getStatus(): WebhookStatus {
    const endpointStatuses = this.config.endpoints.map(endpoint => {
      const status = this.status.get(endpoint.id)!;
      return {
        id: endpoint.id,
        url: endpoint.url,
        enabled: endpoint.enabled,
        messagesSent: status.messagesSent,
        messagesFailed: status.messagesFailed,
        lastError: status.lastError,
        lastSuccessAt: status.lastSuccessAt,
      };
    });

    return {
      enabled: this.config.enabled,
      endpoints: endpointStatuses,
      queueSize: this.messageQueue.length,
      isProcessing: this.isRunning,
    };
  }

  /**
   * Check if dispatcher is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.messageQueue.length;
  }

  /**
   * Add or update endpoint
   */
  addEndpoint(endpoint: WebhookEndpoint): void {
    const existingIndex = this.config.endpoints.findIndex(e => e.id === endpoint.id);
    if (existingIndex >= 0) {
      this.config.endpoints[existingIndex] = endpoint;
    } else {
      this.config.endpoints.push(endpoint);
    }

    if (!this.status.has(endpoint.id)) {
      this.status.set(endpoint.id, {
        messagesSent: 0,
        messagesFailed: 0,
      });
    }

    this.logger.info(`Endpoint added/updated: ${endpoint.id}`);
  }

  /**
   * Remove endpoint
   */
  removeEndpoint(endpointId: string): void {
    const index = this.config.endpoints.findIndex(e => e.id === endpointId);
    if (index >= 0) {
      this.config.endpoints.splice(index, 1);
      this.status.delete(endpointId);
      this.logger.info(`Endpoint removed: ${endpointId}`);
    }
  }
}
