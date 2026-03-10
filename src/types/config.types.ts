/**
 * Configuration Type Definitions
 *
 * Type definitions for application configuration.
 * Based on specs/architecture.md configuration sections.
 */

/**
 * Application Configuration
 * Root configuration interface
 */
export interface AppConfig {
  server: ServerConfig;
  mqtt: MQTTConfig;
  database: DatabaseConfig;
  cache: CacheConfig;
  modules: ModulesConfig;
  api: APIConfig;
  logging: LoggingConfig;
}

/**
 * Server Configuration
 */
export interface ServerConfig {
  port: number;
  host: string;
  environment: 'development' | 'production' | 'test';
}

/**
 * MQTT Broker Configuration
 */
export interface MQTTConfig {
  enabled: boolean;
  broker: MQTTBrokerConfig;
  subscriptions: MQTTSubscriptions;
}

export interface MQTTBrokerConfig {
  host: string;
  port: number;
  protocol: 'mqtt' | 'mqtts' | 'ws' | 'wss';
  username?: string;
  password?: string;
  clientId?: string;
  reconnectPeriod: number;
  connectTimeout: number;
}

export interface MQTTSubscriptions {
  v5008Topics: string[];
  v6800Topics: string[];
}

/**
 * Database Configuration (MySQL 8.0 only for v1.0)
 */
export interface DatabaseConfig {
  enabled: boolean;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  connectionPool: {
    min: number;
    max: number;
  };
}

/**
 * Cache Configuration (Memory only for v1.0)
 */
export interface CacheConfig {
  type: 'memory';
  maxSize: number;
  defaultTTL: number;
  maxQueueSize: number;
}

/**
 * Module Configuration
 */
export interface ModulesConfig {
  smartHB: SmartHBModuleConfig;
  watchdog: WatchdogModuleConfig;
  mqttRelay: MQTTRelayModuleConfig;
  websocket: WebSocketModuleConfig;
  webhook: WebhookModuleConfig;
  database: DatabaseWriterModuleConfig;
}

export interface SmartHBModuleConfig {
  enabled: boolean;
  config: {
    queryCooldown: number;
    triggerOnHeartbeat: boolean;
  };
}

export interface WatchdogModuleConfig {
  enabled: boolean;
  config: {
    healthCheckInterval: number;
    tasks: ScheduledTask[];
  };
}

export interface ScheduledTask {
  name: string;
  interval: number;
  enabled: boolean;
}

export interface MQTTRelayModuleConfig {
  enabled: boolean;
  config: {
    topicPatterns: string[];
    qos: number;
    retain: boolean;
  };
}

export interface WebSocketModuleConfig {
  enabled: boolean;
  config: {
    port: number;
    path: string;
    authentication: {
      enabled: boolean;
      tokenHeader: string;
    };
  };
}

export interface WebhookModuleConfig {
  enabled: boolean;
  config: {
    urls: WebhookEndpoint[];
    retryPolicy: RetryPolicy;
    timeout: number;
  };
}

export interface WebhookEndpoint {
  url: string;
  headers?: Record<string, string>;
}

export interface RetryPolicy {
  maxRetries: number;
  backoffStrategy: 'exponential' | 'linear';
  initialDelay: number;
}

export interface DatabaseWriterModuleConfig {
  enabled: boolean;
  config: {
    batchSize: number;
    maxQueueSize: number;
    retryCount: number;
    queueTimeout: number;
  };
}

/**
 * API Configuration
 */
export interface APIConfig {
  enabled: boolean;
  port: number;
  cors: CORSConfig;
  authentication: AuthConfig;
}

export interface CORSConfig {
  enabled: boolean;
  origins: string[];
}

export interface AuthConfig {
  enabled: boolean;
  jwtSecret: string;
  tokenExpiry: string;
}

/**
 * Logging Configuration
 */
export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'json' | 'text';
  outputs: ('console' | 'file')[];
  file?: {
    path: string;
    maxSize: string;
    maxFiles: number;
  };
}

/**
 * Environment Variable Mapping
 * Maps environment variables to config paths
 */
export interface EnvVarMapping {
  [envVar: string]: string; // env var name -> config path (dot notation)
}

/**
 * Default environment variable mappings
 */
export const DEFAULT_ENV_MAPPINGS: EnvVarMapping = {
  MQTT_BROKER_HOST: 'mqtt.broker.host',
  MQTT_BROKER_PORT: 'mqtt.broker.port',
  MQTT_BROKER_USERNAME: 'mqtt.broker.username',
  MQTT_BROKER_PASSWORD: 'mqtt.broker.password',
  DB_HOST: 'database.host',
  DB_PORT: 'database.port',
  DB_DATABASE: 'database.database',
  DB_USERNAME: 'database.username',
  DB_PASSWORD: 'database.password',
  API_JWT_SECRET: 'api.authentication.jwtSecret',
  API_PORT: 'api.port',
  LOG_LEVEL: 'logging.level',
};
