/**
 * WebSocket Server Module
 *
 * Provides real-time WebSocket connections for UI clients.
 * Broadcasts SUO messages and device state changes.
 */

import { WebSocketServer, WebSocket } from 'ws';
import { createServer, Server } from 'http';
import { eventBus, SystemEvents } from '../core/event-bus';
import { Logger } from '../utils/logger';
import { SUOMessageEvent } from '../types/event.types';
import { AnySUOMessage } from '../types/suo.types';

export interface WebSocketConfig {
  enabled: boolean;
  port: number;
  host: string;
  path: string;
  heartbeatInterval: number;
  maxClients: number;
  perMessageDeflate: boolean;
}

export interface WebSocketStatus {
  running: boolean;
  port: number;
  host: string;
  path: string;
  connectedClients: number;
  maxClients: number;
  messagesBroadcast: number;
  startedAt?: Date;
}

interface ClientInfo {
  socket: WebSocket;
  id: string;
  connectedAt: Date;
  lastPingAt: Date;
  subscribedDevices: Set<string>;
  subscribedTypes: Set<string>;
}

/**
 * WebSocket Server
 * Provides real-time updates to connected clients
 */
export class WebSocketOutput {
  private config: WebSocketConfig;
  private logger: Logger;
  private httpServer: Server | null = null;
  private wsServer: WebSocketServer | null = null;
  private clients: Map<string, ClientInfo>;
  private isRunning: boolean = false;
  private status: WebSocketStatus;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(config: WebSocketConfig) {
    this.config = config;
    this.logger = new Logger('WebSocketServer');
    this.clients = new Map();
    this.status = {
      running: false,
      port: config.port,
      host: config.host,
      path: config.path,
      connectedClients: 0,
      maxClients: config.maxClients,
      messagesBroadcast: 0,
    };
  }

  /**
   * Start the WebSocket server
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('WebSocket Server is already running');
      return;
    }

    if (!this.config.enabled) {
      this.logger.info('WebSocket Server is disabled');
      return;
    }

    this.logger.info('Starting WebSocket Server...');

    // Create HTTP server
    this.httpServer = createServer();

    // Create WebSocket server
    this.wsServer = new WebSocketServer({
      server: this.httpServer,
      path: this.config.path,
      perMessageDeflate: this.config.perMessageDeflate,
      maxPayload: 1024 * 1024, // 1MB
    });

    // Setup connection handler
    this.wsServer.on('connection', this.handleConnection.bind(this));

    // Handle server errors
    this.wsServer.on('error', error => {
      this.logger.error('WebSocket Server error', {
        error: error.message,
      });
    });

    // Subscribe to SUO messages
    eventBus.on<SUOMessageEvent>(SystemEvents.SUO_MQTT_MESSAGE, this.handleSUOMessage.bind(this));

    // Start HTTP server
    return new Promise((resolve, reject) => {
      this.httpServer!.listen(this.config.port, this.config.host, () => {
        this.isRunning = true;
        this.status.running = true;
        this.status.startedAt = new Date();

        // Start heartbeat
        this.startHeartbeat();

        this.logger.info(
          `WebSocket Server started on ws://${this.config.host}:${this.config.port}${this.config.path}`
        );
        resolve();
      });

      this.httpServer!.on('error', error => {
        this.logger.error('Failed to start WebSocket Server', {
          error: error.message,
        });
        reject(error);
      });
    });
  }

  /**
   * Stop the WebSocket server
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('Stopping WebSocket Server...');

    // Stop heartbeat
    this.stopHeartbeat();

    // Unsubscribe from events
    eventBus.off<SUOMessageEvent>(SystemEvents.SUO_MQTT_MESSAGE, this.handleSUOMessage.bind(this));

    // Close all client connections
    for (const client of this.clients.values()) {
      client.socket.close(1000, 'Server shutting down');
    }
    this.clients.clear();

    // Close WebSocket server
    if (this.wsServer) {
      this.wsServer.close();
      this.wsServer = null;
    }

    // Close HTTP server
    if (this.httpServer) {
      await new Promise<void>(resolve => {
        this.httpServer!.close(() => resolve());
      });
      this.httpServer = null;
    }

    this.isRunning = false;
    this.status.running = false;
    this.status.connectedClients = 0;

    this.logger.info('WebSocket Server stopped');
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(
    socket: WebSocket,
    req: { url?: string; socket?: { remoteAddress?: string } }
  ): void {
    // Check max clients
    if (this.clients.size >= this.config.maxClients) {
      this.logger.warn('Max clients reached, rejecting connection');
      socket.close(1013, 'Server is at capacity');
      return;
    }

    const clientId = this.generateClientId();
    const clientInfo: ClientInfo = {
      socket,
      id: clientId,
      connectedAt: new Date(),
      lastPingAt: new Date(),
      subscribedDevices: new Set(),
      subscribedTypes: new Set(),
    };

    this.clients.set(clientId, clientInfo);
    this.status.connectedClients = this.clients.size;

    this.logger.info(`Client connected: ${clientId}`, {
      totalClients: this.clients.size,
      ip: req.socket?.remoteAddress,
    });

    // Send welcome message
    this.sendToClient(clientId, {
      type: 'connection',
      data: {
        clientId,
        message: 'Connected to MQTT Middleware WebSocket',
        serverTime: new Date().toISOString(),
      },
    });

    // Setup message handler
    socket.on('message', data => {
      this.handleClientMessage(clientId, data.toString());
    });

    // Setup close handler
    socket.on('close', (code, reason) => {
      this.handleClientDisconnect(clientId, code, reason.toString());
    });

    // Setup error handler
    socket.on('error', error => {
      this.logger.error(`Client error: ${clientId}`, {
        error: error.message,
      });
    });

    // Setup pong handler for heartbeat
    socket.on('pong', () => {
      const client = this.clients.get(clientId);
      if (client) {
        client.lastPingAt = new Date();
      }
    });
  }

  /**
   * Handle message from client
   */
  private handleClientMessage(clientId: string, message: string): void {
    try {
      const data = JSON.parse(message);
      const client = this.clients.get(clientId);

      if (!client) return;

      this.logger.debug(`Received message from client: ${clientId}`, { type: data.type });

      switch (data.type) {
        case 'subscribe':
          this.handleSubscribe(clientId, data);
          break;

        case 'unsubscribe':
          this.handleUnsubscribe(clientId, data);
          break;

        case 'ping':
          this.sendToClient(clientId, { type: 'pong', timestamp: new Date().toISOString() });
          break;

        case 'getDevices':
          this.sendToClient(clientId, {
            type: 'devices',
            data: [], // Could integrate with cache manager
          });
          break;

        default:
          this.sendToClient(clientId, {
            type: 'error',
            data: { message: `Unknown message type: ${data.type}` },
          });
      }
    } catch (error) {
      this.logger.error(`Failed to handle client message: ${clientId}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      this.sendToClient(clientId, {
        type: 'error',
        data: { message: 'Invalid message format' },
      });
    }
  }

  /**
   * Handle client subscription
   */
  private handleSubscribe(clientId: string, data: { devices?: string[]; types?: string[] }): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    if (data.devices) {
      for (const deviceId of data.devices) {
        client.subscribedDevices.add(deviceId);
      }
    }

    if (data.types) {
      for (const type of data.types) {
        client.subscribedTypes.add(type);
      }
    }

    this.sendToClient(clientId, {
      type: 'subscribed',
      data: {
        devices: Array.from(client.subscribedDevices),
        types: Array.from(client.subscribedTypes),
      },
    });

    this.logger.debug(`Client subscribed: ${clientId}`, {
      devices: client.subscribedDevices.size,
      types: client.subscribedTypes.size,
    });
  }

  /**
   * Handle client unsubscription
   */
  private handleUnsubscribe(
    clientId: string,
    data: { devices?: string[]; types?: string[] }
  ): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    if (data.devices) {
      for (const deviceId of data.devices) {
        client.subscribedDevices.delete(deviceId);
      }
    }

    if (data.types) {
      for (const type of data.types) {
        client.subscribedTypes.delete(type);
      }
    }

    this.sendToClient(clientId, {
      type: 'unsubscribed',
      data: {
        devices: Array.from(client.subscribedDevices),
        types: Array.from(client.subscribedTypes),
      },
    });
  }

  /**
   * Handle client disconnect
   */
  private handleClientDisconnect(clientId: string, code: number, reason: string): void {
    this.clients.delete(clientId);
    this.status.connectedClients = this.clients.size;

    this.logger.info(`Client disconnected: ${clientId}`, {
      code,
      reason,
      totalClients: this.clients.size,
    });
  }

  /**
   * Handle SUO messages and broadcast to clients
   */
  private handleSUOMessage(event: SUOMessageEvent): void {
    if (this.clients.size === 0) return;

    const message = event.message;
    const broadcastData = {
      type: 'message',
      data: {
        ...message,
        receivedAt: new Date().toISOString(),
      },
    };

    let sentCount = 0;

    for (const [clientId, client] of this.clients) {
      // Check if client is subscribed to this device
      if (client.subscribedDevices.size > 0 && !client.subscribedDevices.has(message.deviceId)) {
        continue;
      }

      // Check if client is subscribed to this message type
      if (client.subscribedTypes.size > 0 && !client.subscribedTypes.has(message.suoType)) {
        continue;
      }

      if (this.sendToClient(clientId, broadcastData)) {
        sentCount++;
      }
    }

    if (sentCount > 0) {
      this.status.messagesBroadcast += sentCount;
      this.logger.debug(`Broadcast message to ${sentCount} clients`);
    }
  }

  /**
   * Send message to specific client
   */
  private sendToClient(clientId: string, data: unknown): boolean {
    const client = this.clients.get(clientId);
    if (client?.socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      client.socket.send(JSON.stringify(data));
      return true;
    } catch (error) {
      this.logger.error(`Failed to send to client: ${clientId}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Start heartbeat to check client connections
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      const timeout = this.config.heartbeatInterval * 2;

      for (const [clientId, client] of this.clients) {
        // Check if client is still responsive
        if (now - client.lastPingAt.getTime() > timeout) {
          this.logger.warn(`Client heartbeat timeout: ${clientId}`);
          client.socket.terminate();
          this.clients.delete(clientId);
          continue;
        }

        // Send ping
        if (client.socket.readyState === WebSocket.OPEN) {
          client.socket.ping();
        }
      }

      this.status.connectedClients = this.clients.size;
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `ws-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get server status
   */
  getStatus(): WebSocketStatus {
    return { ...this.status };
  }

  /**
   * Check if server is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get connected clients count
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Get configuration
   */
  getConfig(): WebSocketConfig {
    return { ...this.config };
  }
}
