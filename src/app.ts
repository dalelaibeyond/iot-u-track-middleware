/**
 * MQTT Middleware Application
 *
 * Main application class that initializes and coordinates all components:
 * - MQTT Subscriber
 * - Message Parsers (V5008, V6800)
 * - Normalizers
 * - Event Bus
 * - Output modules (Cache, Relay, etc.)
 */

import { getConfig, AppConfig } from './config';
import { EventBus, SystemEvents } from './core/event-bus';
import { ParserFactory } from './core/parser/parser-factory';
import { NormalizerFactory } from './core/normalizer/normalizer-factory';
import { MQTTSubscriber } from './core/mqtt/mqtt-subscriber';
import { UOSCacheManager } from './modules/cache';
import { SmartHBModule } from './modules/smart-hb';
import { ProtocolAdapterModule } from './modules/protocol-adapter';
import { WatchdogModule } from './modules/watchdog';
import { CommandService } from './modules/command';
import { Database, createDatabase } from './database/database';
import { DatabaseWriter } from './database/database-writer';
import { APIServer } from './api/server';
import { MQTTRelay, WebSocketOutput, WebhookDispatcher, WebhookEndpoint } from './output';
import { Logger, LogLevel } from './utils/logger';
import { IMessageParser } from './core/parser/parser.interface';
import { INormalizer } from './core/normalizer/normalizer.interface';
import { RawMQTTMessageEvent, SIFMessageEvent, SUOMessageEvent } from './types/event.types';
import { SIFMessage } from './types/sif.types';

export class Application {
  private config: AppConfig;
  private logger: Logger;
  private eventBus: EventBus;
  private parsers: Map<string, IMessageParser>;
  private normalizers: Map<string, INormalizer>;
  private uosCacheManager: UOSCacheManager;
  private mqttSubscriber: MQTTSubscriber;
  private smartHB: SmartHBModule;
  private protocolAdapter: ProtocolAdapterModule;
  private watchdog: WatchdogModule;
  private commandService: CommandService;
  private database: Database;
  private databaseWriter: DatabaseWriter;
  private apiServer: APIServer;
  private mqttRelay: MQTTRelay | null = null;
  private webSocketServer: WebSocketOutput | null = null;
  private webhookDispatcher: WebhookDispatcher | null = null;
  private isRunning: boolean = false;

  constructor() {
    this.config = getConfig();
    this.logger = new Logger('Application');
    this.eventBus = EventBus.getInstance();
    this.parsers = new Map();
    this.normalizers = new Map();
    this.uosCacheManager = new UOSCacheManager();
    this.mqttSubscriber = new MQTTSubscriber();

    // Initialize optional modules
    this.smartHB = new SmartHBModule(
      {
        enabled: this.config.modules.smartHB.enabled,
        queryCooldown: this.config.modules.smartHB.config.queryCooldown,
        triggerOnHeartbeat: this.config.modules.smartHB.config.triggerOnHeartbeat,
        enableDeviceInfoRepair: true, // Enable device info repair
      },
      this.uosCacheManager
    );

    this.protocolAdapter = new ProtocolAdapterModule(
      {
        enabled: this.config.modules.protocolAdapter.enabled,
        dedupWindowMs: this.config.modules.protocolAdapter.config.deduplicationWindow,
      },
      this.uosCacheManager.getCache()
    );

    this.watchdog = new WatchdogModule(
      {
        enabled: false, // Disabled by default
        healthCheckInterval: 30000, // 30 seconds
        tasks: [],
      },
      this.uosCacheManager
    );

    this.commandService = new CommandService({
      enabled: true, // Enabled by default
      defaultTimeout: 30000, // 30 seconds
      maxRetries: 3,
    });

    // Initialize database if enabled
    this.database = createDatabase(this.config.database);

    // Initialize database writer
    this.databaseWriter = new DatabaseWriter(this.config.databaseWriter, this.database);

    // Initialize API server
    this.apiServer = new APIServer(
      {
        enabled: this.config.api.enabled,
        port: this.config.api.port,
        host: this.config.api.host,
        enableCors: this.config.api.enableCors,
        corsOrigins: this.config.api.corsOrigins,
        apiPrefix: this.config.api.apiPrefix,
      },
      this
    );

    // Initialize output modules if enabled
    this.initializeOutputModules();
  }

  /**
   * Initialize output modules (MQTT Relay, WebSocket, Webhook)
   */
  private initializeOutputModules(): void {
    // MQTT Relay
    if (this.config.output.mqttRelay.enabled) {
      this.mqttRelay = new MQTTRelay({
        enabled: true,
        brokerUrl: this.config.output.mqttRelay.brokerUrl,
        clientId: this.config.output.mqttRelay.clientId,
        username: this.config.output.mqttRelay.username,
        password: this.config.output.mqttRelay.password,
        reconnectPeriod: this.config.output.mqttRelay.reconnectPeriod,
        connectTimeout: this.config.output.mqttRelay.connectTimeout,
        keepalive: this.config.output.mqttRelay.keepalive,
        qos: this.config.output.mqttRelay.qos,
        retain: this.config.output.mqttRelay.retain,
        topicPrefix: this.config.output.mqttRelay.topicPrefix,
        includeDeviceType: this.config.output.mqttRelay.includeDeviceType,
      });
    }

    // WebSocket Server
    if (this.config.output.webSocket.enabled) {
      this.webSocketServer = new WebSocketOutput({
        enabled: true,
        port: this.config.output.webSocket.port,
        host: this.config.output.webSocket.host,
        path: this.config.output.webSocket.path,
        heartbeatInterval: this.config.output.webSocket.heartbeatInterval,
        maxClients: this.config.output.webSocket.maxClients,
        perMessageDeflate: this.config.output.webSocket.perMessageDeflate,
      });
    }

    // Webhook Dispatcher
    if (this.config.output.webhook.enabled) {
      this.webhookDispatcher = new WebhookDispatcher({
        enabled: true,
        endpoints: this.config.output.webhook.endpoints as WebhookEndpoint[],
        defaultRetryConfig: this.config.output.webhook.defaultRetryConfig,
        maxConcurrentRequests: this.config.output.webhook.maxConcurrentRequests,
      });
    }
  }

  /**
   * Initialize the application
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing MQTT Middleware Application...');

    // Set log level
    const logLevelMap: Record<string, LogLevel> = {
      error: LogLevel.ERROR,
      warn: LogLevel.WARN,
      info: LogLevel.INFO,
      debug: LogLevel.DEBUG,
    };
    Logger.setLogLevel(logLevelMap[this.config.log.level] || LogLevel.INFO);

    // Initialize parsers
    this.initializeParsers();

    // Initialize normalizers
    this.initializeNormalizers();

    // Setup event handlers
    this.setupEventHandlers();

    this.logger.info('Application initialized successfully');
  }

  /**
   * Initialize message parsers
   */
  private initializeParsers(): void {
    this.logger.info('Initializing parsers...');

    // Register V5008 parser
    const v5008Parser = ParserFactory.getParser('V5008Upload/123/OpeAck');
    this.parsers.set('V5008', v5008Parser);

    // Register V6800 parser
    const v6800Parser = ParserFactory.getParser('V6800Upload/123/Init');
    this.parsers.set('V6800', v6800Parser);

    this.logger.info(`Initialized ${this.parsers.size} parsers`);
  }

  /**
   * Initialize normalizers
   */
  private initializeNormalizers(): void {
    this.logger.info('Initializing normalizers...');

    // Register V5008 normalizer
    const v5008Normalizer = NormalizerFactory.getNormalizer({
      deviceType: 'V5008',
      messageType: 'HEARTBEAT',
    } as SIFMessage);
    this.normalizers.set('V5008', v5008Normalizer);

    // Register V6800 normalizer
    const v6800Normalizer = NormalizerFactory.getNormalizer({
      deviceType: 'V6800',
      messageType: 'DEV_MOD_INFO',
    } as SIFMessage);
    this.normalizers.set('V6800', v6800Normalizer);

    this.logger.info(`Initialized ${this.normalizers.size} normalizers`);
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.logger.info('Setting up event handlers...');

    // Handle raw MQTT messages
    this.eventBus.on<RawMQTTMessageEvent>(
      SystemEvents.RAW_MQTT_MESSAGE,
      this.handleRawMessage.bind(this)
    );

    // Handle SIF messages
    this.eventBus.on<SIFMessageEvent>(SystemEvents.SIF_MESSAGE, this.handleSIFMessage.bind(this));

    // Handle SUO messages
    this.eventBus.on<SUOMessageEvent>(
      SystemEvents.SUO_MQTT_MESSAGE,
      this.handleSUOMessage.bind(this)
    );

    this.logger.info('Event handlers setup complete');
  }

  /**
   * Handle raw MQTT message
   */
  private async handleRawMessage(event: RawMQTTMessageEvent): Promise<void> {
    try {
      this.logger.info('Received raw MQTT message', {
        topic: event.topic,
        payloadSize: event.payload.length,
        payloadHex: event.payload.toString('hex').substring(0, 100),
      });

      // Get appropriate parser
      const parser = ParserFactory.getParser(event.topic);

      // Parse to SIF
      const rawMessage = {
        topic: event.topic,
        payload: event.payload,
        qos: event.qos,
        retain: event.retain,
        timestamp: event.timestamp,
      };

      const parsedResult = await parser.parse(rawMessage);

      // Handle both single message and array of messages
      const sifMessages = Array.isArray(parsedResult) ? parsedResult : [parsedResult];

      // Emit SIF message event(s)
      for (const sifMessage of sifMessages) {
        // Print SIF message with color highlighting
        console.log('\n📥 SIF MESSAGE:');
        console.log(sifMessage);
        console.log('');

        this.eventBus.emit<SIFMessageEvent>(SystemEvents.SIF_MESSAGE, {
          message: sifMessage,
          raw: event,
        });
      }
    } catch (error) {
      this.logger.error('Failed to parse raw message', {
        topic: event.topic,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Handle SIF message
   */
  private async handleSIFMessage(event: SIFMessageEvent): Promise<void> {
    try {
      this.logger.debug('Received SIF message', {
        deviceType: event.message.deviceType,
        messageType: event.message.messageType,
      });

      // Get appropriate normalizer
      const normalizer = NormalizerFactory.getNormalizer(event.message);

      // Normalize to SUO
      const suoMessages = await normalizer.normalize(event.message);

      // Emit SUO message event(s)
      const messages = Array.isArray(suoMessages) ? suoMessages : [suoMessages];

      for (const suoMessage of messages) {
        // Print SUO message with color highlighting
        console.log('\n📤 SUO MESSAGE:');
        console.log(suoMessage);
        console.log('');

        this.eventBus.emit<SUOMessageEvent>(SystemEvents.SUO_MQTT_MESSAGE, {
          message: suoMessage,
          sif: event.message,
        });
      }
    } catch (error) {
      this.logger.error('Failed to normalize SIF message', {
        deviceType: event.message.deviceType,
        messageType: event.message.messageType,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Handle SUO message
   */
  private handleSUOMessage(event: SUOMessageEvent): void {
    try {
      this.logger.debug('Received SUO message', {
        suoType: event.message.suoType,
        deviceId: event.message.deviceId,
        moduleIndex: (event.message as any).moduleIndex ?? null,
      });

      // Note: All output modules are handled automatically via EventBus subscription:
      // - UOS Cache Manager (via EventBus)
      // - Database Writer (via EventBus)
      // - MQTT Relay (via EventBus)
      // - WebSocket Server (via EventBus)
      // - Webhook Dispatcher (via EventBus)

      this.logger.info('SUO message processed and routed to output modules', {
        suoType: event.message.suoType,
        deviceId: event.message.deviceId,
      });
    } catch (error) {
      this.logger.error('Failed to process SUO message', {
        suoType: event.message.suoType,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Setup signal handlers for graceful shutdown
   */
  private setupSignalHandlers(): void {
    const handleShutdown = async (signal: string): Promise<void> => {
      this.logger.info(`Received ${signal}, shutting down gracefully...`);

      try {
        await this.stop();
        this.logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        this.logger.error('Error during shutdown', {
          error: error instanceof Error ? error.message : String(error),
        });
        process.exit(1);
      }
    };

    // Handle Ctrl+C
    process.on('SIGINT', () => {
      void handleShutdown('SIGINT');
    });

    // Handle termination signal
    process.on('SIGTERM', () => {
      void handleShutdown('SIGTERM');
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', error => {
      this.logger.error('Uncaught exception', {
        error: error.message,
        stack: error.stack,
      });
      void handleShutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled promise rejection', { reason });
    });

    this.logger.debug('Signal handlers registered');
  }

  /**
   * Start the application
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Application is already running');
      return;
    }

    this.logger.info('Starting MQTT Middleware Application...');
    this.isRunning = true;

    // Initialize the application (setup event handlers, etc.)
    await this.initialize();

    // Setup signal handlers for graceful shutdown
    this.setupSignalHandlers();

    // Start UOS Cache Manager if enabled
    if (this.config.features.enableCache) {
      this.uosCacheManager.start();
      this.logger.info('UOS Cache Manager started');
    }

    // Connect to database if enabled
    if (this.config.database.enabled) {
      try {
        await this.database.connect();
        this.logger.info('Database connected');

        // Start database writer
        this.databaseWriter.start();
        this.logger.info('Database Writer started');
      } catch (error) {
        this.logger.error('Failed to connect to database', {
          error: error instanceof Error ? error.message : String(error),
        });
        // Don't throw - continue without database
      }
    }

    // Connect to MQTT broker
    try {
      await this.mqttSubscriber.connect();
      this.logger.info('MQTT Subscriber connected');
    } catch (error) {
      this.logger.error('Failed to connect to MQTT broker', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

    // Start optional modules
    if (this.config.modules.smartHB.enabled) {
      this.smartHB.start();
      this.logger.info('SmartHB module started');
    }

    if (this.config.modules.protocolAdapter.enabled) {
      this.protocolAdapter.start();
      this.logger.info('ProtocolAdapter module started');
    }

    this.watchdog.start();
    this.commandService.start();

    // Start API server
    try {
      await this.apiServer.start();
    } catch (error) {
      this.logger.error('Failed to start API Server', {
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - continue without API
    }

    // Start output modules
    await this.startOutputModules();

    this.logger.info('Application started successfully');
    this.logger.info(`Environment: ${this.config.nodeEnv}`);
    this.logger.info(`MQTT Broker: ${this.config.mqtt.brokerUrl}`);
  }

  /**
   * Start all output modules
   */
  private async startOutputModules(): Promise<void> {
    // Start MQTT Relay
    if (this.mqttRelay) {
      try {
        await this.mqttRelay.start();
        this.logger.info('MQTT Relay started');
      } catch (error) {
        this.logger.error('Failed to start MQTT Relay', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Start WebSocket Server
    if (this.webSocketServer) {
      try {
        await this.webSocketServer.start();
        this.logger.info('WebSocket Server started');
      } catch (error) {
        this.logger.error('Failed to start WebSocket Server', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Start Webhook Dispatcher
    if (this.webhookDispatcher) {
      try {
        this.webhookDispatcher.start();
        this.logger.info('Webhook Dispatcher started');
      } catch (error) {
        this.logger.error('Failed to start Webhook Dispatcher', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Stop the application gracefully
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('Stopping MQTT Middleware Application...');
    this.isRunning = false;

    // Disconnect MQTT Subscriber
    if (this.mqttSubscriber.isMqttConnected()) {
      await this.mqttSubscriber.disconnect();
      this.logger.info('MQTT Subscriber disconnected');
    }

    // Stop UOS Cache Manager
    if (this.uosCacheManager.isActive()) {
      this.uosCacheManager.stop();
      this.logger.info('UOS Cache Manager stopped');
    }

    // Stop database writer and disconnect
    if (this.databaseWriter.isActive()) {
      await this.databaseWriter.stop();
      this.logger.info('Database Writer stopped');
    }

    if (this.database.isDatabaseConnected()) {
      await this.database.disconnect();
      this.logger.info('Database disconnected');
    }

    // Stop optional modules
    if (this.smartHB.isActive()) {
      this.smartHB.stop();
      this.logger.info('SmartHB stopped');
    }

    if (this.protocolAdapter.isActive()) {
      this.protocolAdapter.stop();
      this.logger.info('ProtocolAdapter stopped');
    }

    if (this.watchdog.isActive()) {
      this.watchdog.stop();
      this.logger.info('Watchdog stopped');
    }

    if (this.commandService.isActive()) {
      this.commandService.stop();
      this.logger.info('CommandService stopped');
    }

    // Stop output modules
    await this.stopOutputModules();

    // Stop API server
    if (this.apiServer.isActive()) {
      await this.apiServer.stop();
    }

    // Remove event listeners
    this.eventBus.removeAllListeners();

    this.logger.info('Application stopped');
  }

  /**
   * Stop all output modules
   */
  private async stopOutputModules(): Promise<void> {
    // Stop Webhook Dispatcher
    if (this.webhookDispatcher?.isActive()) {
      await this.webhookDispatcher.stop();
      this.logger.info('Webhook Dispatcher stopped');
    }

    // Stop WebSocket Server
    if (this.webSocketServer?.isActive()) {
      await this.webSocketServer.stop();
      this.logger.info('WebSocket Server stopped');
    }

    // Stop MQTT Relay
    if (this.mqttRelay?.isActive()) {
      await this.mqttRelay.stop();
      this.logger.info('MQTT Relay stopped');
    }
  }

  /**
   * Check if application is running
   */
  isAppRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get UOS Cache Manager instance
   */
  getUOSCacheManager(): UOSCacheManager {
    return this.uosCacheManager;
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.uosCacheManager.getStats();
  }

  /**
   * Get MQTT Subscriber instance
   */
  getMQTTSubscriber(): MQTTSubscriber {
    return this.mqttSubscriber;
  }

  /**
   * Get MQTT connection status
   */
  getMQTTStatus() {
    return this.mqttSubscriber.getStatus();
  }

  /**
   * Get SmartHB module
   */
  getSmartHB(): SmartHBModule {
    return this.smartHB;
  }

  /**
   * Get ProtocolAdapter module
   */
  getProtocolAdapter(): ProtocolAdapterModule {
    return this.protocolAdapter;
  }

  /**
   * Get Watchdog module
   */
  getWatchdog(): WatchdogModule {
    return this.watchdog;
  }

  /**
   * Get Command Service
   */
  getCommandService(): CommandService {
    return this.commandService;
  }

  /**
   * Get Database instance
   */
  getDatabase(): Database {
    return this.database;
  }

  /**
   * Get Database Writer
   */
  getDatabaseWriter(): DatabaseWriter {
    return this.databaseWriter;
  }

  /**
   * Get API Server
   */
  getAPIServer(): APIServer {
    return this.apiServer;
  }

  /**
   * Get MQTT Relay
   */
  getMQTTRelay(): MQTTRelay | null {
    return this.mqttRelay;
  }

  /**
   * Get WebSocket Server
   */
  getWebSocketServer(): WebSocketOutput | null {
    return this.webSocketServer;
  }

  /**
   * Get Webhook Dispatcher
   */
  getWebhookDispatcher(): WebhookDispatcher | null {
    return this.webhookDispatcher;
  }
}

// Export singleton instance
export const app = new Application();

// Auto-start the application when this module is loaded (only in non-test environments)
if (process.env.NODE_ENV !== 'test') {
  app.start().catch(error => {
    console.error('Failed to start application:', error);
    process.exit(1);
  });
}
