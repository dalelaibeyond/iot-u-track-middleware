/**
 * Command Controller
 *
 * Handles command-related API requests
 */

import { Request, Response } from 'express';
import { Application } from '../../app';
import { eventBus, SystemEvents } from '../../core/event-bus';
import { CommandRequestEvent } from '../../types/event.types';
import { NotFoundError, ValidationError } from '../middleware/error-handler';

// Valid command types
const VALID_COMMANDS = [
  'QUERY_DEVICE_INFO',
  'QUERY_MODULE_INFO',
  'QUERY_RFID_SNAPSHOT',
  'QUERY_DOOR_STATE',
  'QUERY_TEMP_HUM',
  'SET_COLOR',
  'CLEAR_ALARM',
] as const;

type CommandType = (typeof VALID_COMMANDS)[number];

interface SendCommandRequest {
  deviceId: string;
  deviceType: 'V5008' | 'V6800';
  command: CommandType;
  moduleIndex?: number;
  uIndex?: number;
  sensors?: Array<{
    uIndex: number;
    colorCode: number;
  }>;
  uuid?: string;
}

export class CommandController {
  private application: Application;

  constructor(application: Application) {
    this.application = application;
  }

  /**
   * POST /commands - Send a command to a device
   */
  async sendCommand(req: Request, res: Response): Promise<void> {
    const body = req.body as SendCommandRequest;

    // Validate required fields
    this.validateCommandRequest(body);

    // Generate command ID
    const commandId = this.generateCommandId();

    // Build command data
    const commandData = this.buildCommandData(body);

    // Create command request event
    const commandEvent: CommandRequestEvent = {
      commandId,
      deviceId: body.deviceId,
      deviceType: body.deviceType,
      messageType: body.command,
      data: commandData,
      timestamp: new Date(),
    };

    // Emit command request
    eventBus.emit<CommandRequestEvent>(SystemEvents.COMMAND_REQUEST, commandEvent);

    res.status(202).json({
      success: true,
      message: 'Command accepted',
      data: {
        commandId,
        deviceId: body.deviceId,
        command: body.command,
        status: 'pending',
        timestamp: commandEvent.timestamp.toISOString(),
      },
    });
  }

  /**
   * GET /commands/:id - Get command status
   */
  async getCommandStatus(req: Request, res: Response): Promise<void> {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const commandService = this.application.getCommandService();

    const status = commandService.getCommandStatus(id);

    if (!status) {
      throw new NotFoundError('Command', id);
    }

    res.json({
      success: true,
      data: {
        commandId: status.commandId,
        deviceId: status.deviceId,
        deviceType: status.deviceType,
        command: status.messageType,
        status: status.status,
        sentAt: status.sentAt?.toISOString() ?? null,
        completedAt: status.completedAt?.toISOString() ?? null,
        result: status.result ?? null,
        retryCount: status.retryCount,
      },
    });
  }

  /**
   * GET /commands - List pending commands
   */
  async listPendingCommands(_req: Request, res: Response): Promise<void> {
    const commandService = this.application.getCommandService();
    const pendingCommands = commandService.getPendingCommands();

    res.json({
      success: true,
      count: pendingCommands.length,
      data: pendingCommands.map(cmd => ({
        commandId: cmd.commandId,
        deviceId: cmd.deviceId,
        deviceType: cmd.deviceType,
        command: cmd.messageType,
        status: cmd.status,
        sentAt: cmd.sentAt?.toISOString() ?? null,
        retryCount: cmd.retryCount,
      })),
    });
  }

  /**
   * Validate command request
   */
  private validateCommandRequest(body: SendCommandRequest): void {
    // Check deviceId
    if (!body.deviceId || typeof body.deviceId !== 'string') {
      throw new ValidationError('deviceId is required and must be a string');
    }

    // Check deviceType
    if (!body.deviceType || !['V5008', 'V6800'].includes(body.deviceType)) {
      throw new ValidationError('deviceType must be either "V5008" or "V6800"');
    }

    // Check command
    if (!body.command || !VALID_COMMANDS.includes(body.command)) {
      throw new ValidationError(`command must be one of: ${VALID_COMMANDS.join(', ')}`, {
        validCommands: VALID_COMMANDS,
      });
    }

    // Validate module-specific commands
    const moduleRequiredCommands: CommandType[] = [
      'QUERY_RFID_SNAPSHOT',
      'QUERY_DOOR_STATE',
      'QUERY_TEMP_HUM',
      'SET_COLOR',
      'CLEAR_ALARM',
    ];

    if (moduleRequiredCommands.includes(body.command)) {
      if (body.moduleIndex === undefined || body.moduleIndex === null) {
        throw new ValidationError(`moduleIndex is required for command: ${body.command}`, {
          command: body.command,
          requiredField: 'moduleIndex',
        });
      }

      if (typeof body.moduleIndex !== 'number' || body.moduleIndex < 1) {
        throw new ValidationError('moduleIndex must be a positive number', {
          provided: body.moduleIndex,
        });
      }
    }

    // Validate SET_COLOR specific fields
    if (body.command === 'SET_COLOR') {
      if (!body.sensors || !Array.isArray(body.sensors) || body.sensors.length === 0) {
        throw new ValidationError('sensors array is required for SET_COLOR command', {
          expectedFormat: [
            { uIndex: 1, colorCode: 1 },
            { uIndex: 2, colorCode: 2 },
          ],
        });
      }

      for (const sensor of body.sensors) {
        if (typeof sensor.uIndex !== 'number' || typeof sensor.colorCode !== 'number') {
          throw new ValidationError('Each sensor must have uIndex and colorCode as numbers', {
            sensor,
          });
        }
      }
    }

    // Validate CLEAR_ALARM specific fields
    if (body.command === 'CLEAR_ALARM') {
      if (body.uIndex === undefined || body.uIndex === null) {
        throw new ValidationError('uIndex is required for CLEAR_ALARM command', {
          command: body.command,
          requiredField: 'uIndex',
        });
      }

      if (typeof body.uIndex !== 'number' || body.uIndex < 1) {
        throw new ValidationError('uIndex must be a positive number', { provided: body.uIndex });
      }
    }
  }

  /**
   * Build command data based on command type
   */
  private buildCommandData(body: SendCommandRequest): Record<string, unknown> {
    const data: Record<string, unknown> = {};

    // Add moduleIndex for module-specific commands
    if (body.moduleIndex !== undefined) {
      data.moduleIndex = body.moduleIndex;
    }

    // Add uIndex for CLEAR_ALARM
    if (body.uIndex !== undefined) {
      data.uIndex = body.uIndex;
    }

    // Add sensors for SET_COLOR
    if (body.sensors !== undefined) {
      data.sensors = body.sensors;
    }

    // Add uuid for V6800 commands (optional, will be generated if not provided)
    if (body.uuid !== undefined) {
      data.uuid = body.uuid;
    }

    return data;
  }

  /**
   * Generate unique command ID
   */
  private generateCommandId(): string {
    return `cmd-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
