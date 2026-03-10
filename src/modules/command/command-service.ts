/**
 * Command Service
 *
 * Handles command requests and publishes commands to devices
 * - Converts command requests to device-specific formats
 * - Publishes commands via MQTT
 * - Tracks command status
 */

import { eventBus, SystemEvents } from '../../core/event-bus';
import { Logger } from '../../utils/logger';
import { CommandRequestEvent, CommandPublishEvent, SUOMessageEvent } from '../../types/event.types';
import { SUOCommandResult } from '../../types/suo.types';

export interface CommandConfig {
  enabled: boolean;
  defaultTimeout: number;
  maxRetries: number;
}

export interface CommandStatus {
  commandId: string;
  deviceId: string;
  deviceType: 'V5008' | 'V6800';
  messageType: string;
  status: 'pending' | 'sent' | 'completed' | 'failed';
  sentAt?: Date;
  completedAt?: Date;
  result?: string;
  retryCount: number;
  originalData?: Record<string, unknown>;
}

export class CommandService {
  private config: CommandConfig;
  private logger: Logger;
  private isRunning: boolean = false;
  private pendingCommands: Map<string, CommandStatus> = new Map();
  private commandTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: CommandConfig) {
    this.config = config;
    this.logger = new Logger('CommandService');
  }

  /**
   * Start the Command Service
   */
  start(): void {
    if (this.isRunning) {
      this.logger.warn('CommandService is already running');
      return;
    }

    if (!this.config.enabled) {
      this.logger.info('CommandService is disabled');
      return;
    }

    this.logger.info('Starting CommandService...');

    // Subscribe to command requests
    eventBus.on<CommandRequestEvent>(
      SystemEvents.COMMAND_REQUEST,
      this.handleCommandRequest.bind(this)
    );

    // Subscribe to command results
    eventBus.on<SUOMessageEvent>(
      SystemEvents.SUO_MQTT_MESSAGE,
      this.handleCommandResult.bind(this)
    );

    this.isRunning = true;
    this.logger.info('CommandService started');
  }

  /**
   * Stop the Command Service
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('Stopping CommandService...');

    // Unsubscribe from events
    eventBus.off<CommandRequestEvent>(
      SystemEvents.COMMAND_REQUEST,
      this.handleCommandRequest.bind(this)
    );

    eventBus.off<SUOMessageEvent>(
      SystemEvents.SUO_MQTT_MESSAGE,
      this.handleCommandResult.bind(this)
    );

    // Clear all timeouts
    for (const timeout of this.commandTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.commandTimeouts.clear();

    this.isRunning = false;
    this.logger.info('CommandService stopped');
  }

  /**
   * Handle command requests
   */
  private handleCommandRequest(event: CommandRequestEvent): void {
    this.logger.info('Received command request', {
      commandId: event.commandId,
      deviceId: event.deviceId,
      deviceType: event.deviceType,
      messageType: event.messageType,
    });

    // Create command status
    const status: CommandStatus = {
      commandId: event.commandId,
      deviceId: event.deviceId,
      deviceType: event.deviceType,
      messageType: event.messageType,
      status: 'pending',
      retryCount: 0,
      originalData: event.data,
    };

    this.pendingCommands.set(event.commandId, status);

    // Convert to device-specific format and publish
    this.publishCommand(event, status);
  }

  /**
   * Publish command to device
   */
  private publishCommand(request: CommandRequestEvent, status: CommandStatus): void {
    try {
      const payload = this.buildCommandPayload(request);
      const topic = this.buildCommandTopic(request);

      // Create publish event
      const publishEvent: CommandPublishEvent = {
        commandId: request.commandId,
        topic,
        payload,
        qos: 1,
        timestamp: new Date(),
      };

      // Update status
      status.status = 'sent';
      status.sentAt = new Date();

      // Emit publish event (will be handled by MQTTPublisher)
      eventBus.emit<CommandPublishEvent>(SystemEvents.COMMAND_PUBLISH, publishEvent);

      this.logger.info('Command published', {
        commandId: request.commandId,
        topic,
        deviceId: request.deviceId,
      });

      // Set timeout for command response
      this.setCommandTimeout(request.commandId);
    } catch (error) {
      this.logger.error('Failed to publish command', {
        commandId: request.commandId,
        error: error instanceof Error ? error.message : String(error),
      });

      status.status = 'failed';
      this.pendingCommands.set(request.commandId, status);
    }
  }

  /**
   * Build command payload based on device type
   */
  private buildCommandPayload(request: CommandRequestEvent): Buffer {
    const { deviceType, messageType, data } = request;

    if (deviceType === 'V5008') {
      // V5008 binary commands
      return this.buildV5008Payload(messageType, data);
    } else {
      // V6800 JSON commands
      return this.buildV6800Payload(messageType, data);
    }
  }

  /**
   * Build V5008 binary payload
   */
  private buildV5008Payload(messageType: string, data: Record<string, unknown>): Buffer {
    switch (messageType) {
      case 'QUERY_DEVICE_INFO':
        return Buffer.from([0xef, 0x01]);

      case 'QUERY_MODULE_INFO':
        return Buffer.from([0xef, 0x02]);

      case 'QUERY_RFID_SNAPSHOT':
        return Buffer.from([0xe4, (data.moduleIndex as number) || 0x01]);

      case 'QUERY_DOOR_STATE':
        return Buffer.from([0xe5, (data.moduleIndex as number) || 0x01]);

      case 'QUERY_TEMP_HUM':
        return Buffer.from([0xe6, (data.moduleIndex as number) || 0x01]);

      case 'SET_COLOR':
        // Format: [E1][ModAddr][uIndex][colorCode]...
        const sensors = (data.sensors as Array<{ uIndex: number; colorCode: number }>) || [];
        const payload = [0xe1, (data.moduleIndex as number) || 0x01];
        for (const sensor of sensors) {
          payload.push(sensor.uIndex, sensor.colorCode);
        }
        return Buffer.from(payload);

      case 'CLEAR_ALARM':
        return Buffer.from([
          0xe2,
          (data.moduleIndex as number) || 0x01,
          (data.uIndex as number) || 0x01,
        ]);

      default:
        throw new Error(`Unknown V5008 command type: ${messageType}`);
    }
  }

  /**
   * Build V6800 JSON payload
   */
  private buildV6800Payload(messageType: string, data: Record<string, unknown>): Buffer {
    let msgType: string;
    let payload: Record<string, unknown>;

    switch (messageType) {
      case 'QUERY_DEVICE_INFO':
        msgType = 'get_devies_init_req';
        payload = { msg_code: 200 };
        break;

      case 'QUERY_MODULE_INFO':
        msgType = 'get_module_info_req';
        payload = { msg_code: 200 };
        break;

      case 'QUERY_RFID_SNAPSHOT':
        msgType = 'get_u_state_req';
        payload = {
          uuid_number: data.uuid || this.generateUUID(),
        };
        break;

      case 'QUERY_DOOR_STATE':
        msgType = 'door_state_req';
        payload = {
          uuid_number: data.uuid || this.generateUUID(),
          gateway_port_index: data.moduleIndex || 1,
        };
        break;

      case 'QUERY_TEMP_HUM':
        msgType = 'temper_humidity_req';
        payload = {
          uuid_number: data.uuid || this.generateUUID(),
          gateway_port_index: data.moduleIndex || 1,
        };
        break;

      case 'SET_COLOR':
        msgType = 'set_u_color_req';
        payload = {
          uuid_number: data.uuid || this.generateUUID(),
          gateway_port_index: data.moduleIndex || 1,
          u_data: data.sensors || [],
        };
        break;

      case 'CLEAR_ALARM':
        msgType = 'clear_u_warning_req';
        payload = {
          uuid_number: data.uuid || this.generateUUID(),
          gateway_port_index: data.moduleIndex || 1,
          u_index: data.uIndex || 1,
        };
        break;

      default:
        throw new Error(`Unknown V6800 command type: ${messageType}`);
    }

    return Buffer.from(
      JSON.stringify({
        msg_type: msgType,
        ...payload,
      })
    );
  }

  /**
   * Build command topic
   */
  private buildCommandTopic(request: CommandRequestEvent): string {
    const { deviceType, deviceId } = request;

    if (deviceType === 'V5008') {
      return `V5008Download/${deviceId}`;
    } else {
      return `V6800Download/${deviceId}`;
    }
  }

  /**
   * Handle command results
   */
  private handleCommandResult(event: SUOMessageEvent): void {
    const message = event.message;

    // Only process command result messages
    if (message.suoType !== 'SUO_COMMAND_RESULT') {
      return;
    }

    const result = message as SUOCommandResult;

    // Find pending command by device and command type
    for (const [commandId, status] of this.pendingCommands.entries()) {
      if (status.deviceId === result.deviceId && status.status === 'sent') {
        // Update status
        status.status = result.data.result === 'Success' ? 'completed' : 'failed';
        status.result = result.data.result;
        status.completedAt = new Date();

        // Clear timeout
        const timeout = this.commandTimeouts.get(commandId);
        if (timeout) {
          clearTimeout(timeout);
          this.commandTimeouts.delete(commandId);
        }

        this.logger.info('Command completed', {
          commandId,
          deviceId: result.deviceId,
          result: result.data.result,
        });

        // Remove from pending
        this.pendingCommands.delete(commandId);
        break;
      }
    }
  }

  /**
   * Set timeout for command response
   */
  private setCommandTimeout(commandId: string): void {
    const timeout = setTimeout(() => {
      this.handleCommandTimeout(commandId);
    }, this.config.defaultTimeout);

    this.commandTimeouts.set(commandId, timeout);
  }

  /**
   * Handle command timeout
   */
  private handleCommandTimeout(commandId: string): void {
    const status = this.pendingCommands.get(commandId);
    if (!status) {
      return;
    }

    if (status.retryCount < this.config.maxRetries) {
      // Retry
      status.retryCount++;
      this.logger.warn(
        `Command timeout, retrying (${status.retryCount}/${this.config.maxRetries})`,
        {
          commandId,
          deviceId: status.deviceId,
        }
      );

      // Retry: Re-publish the command
      status.status = 'pending';

      // Rebuild the request and publish again with original data
      const request: CommandRequestEvent = {
        commandId: status.commandId,
        deviceId: status.deviceId,
        deviceType: status.deviceType,
        messageType: status.messageType,
        data: status.originalData || {},
        timestamp: new Date(),
      };

      this.publishCommand(request, status);

      this.logger.info('Command retry initiated', {
        commandId,
        retryCount: status.retryCount,
        maxRetries: this.config.maxRetries,
      });
    } else {
      // Max retries reached
      status.status = 'failed';
      status.completedAt = new Date();
      status.result = 'timeout';

      this.logger.error('Command failed (max retries exceeded)', {
        commandId,
        deviceId: status.deviceId,
      });

      this.pendingCommands.delete(commandId);
    }

    this.commandTimeouts.delete(commandId);
  }

  /**
   * Get command status
   */
  getCommandStatus(commandId: string): CommandStatus | null {
    return this.pendingCommands.get(commandId) || null;
  }

  /**
   * Get all pending commands
   */
  getPendingCommands(): CommandStatus[] {
    return Array.from(this.pendingCommands.values());
  }

  /**
   * Generate UUID
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Check if service is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get configuration
   */
  getConfig(): CommandConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<CommandConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.info('CommandService configuration updated');
  }
}
