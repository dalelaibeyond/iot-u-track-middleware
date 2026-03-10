/**
 * Configuration Management
 *
 * Centralized configuration for the MQTT middleware
 * Loads from environment variables with sensible defaults
 */

import dotenv from 'dotenv';
import { join } from 'path';

// Load environment variables from .env file
dotenv.config({ path: join(process.cwd(), '.env') });

/**
 * Application Configuration
 */
export interface AppConfig {
  // Server
  nodeEnv: string;
  port: number;

  // MQTT Broker
  mqtt: {
    brokerUrl: string;
    clientId: string;
    username?: string;
    password?: string;
    reconnectPeriod: number;
    connectTimeout: number;
    keepalive: number;
    clean: boolean;
  };

  // MQTT Topics
  topics: {
    v5008Upload: string;
    v5008Download: string;
    v6800Upload: string;
    v6800Download: string;
  };

  // Database
  database: {
    enabled: boolean;
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    connectionLimit: number;
  };

  // Database Writer
  databaseWriter: {
    enabled: boolean;
    batchSize: number;
    maxQueueSize: number;
    retryCount: number;
    queueTimeout: number;
  };

  // Logging
  log: {
    level: string;
    format: string;
  };

  // Features
  features: {
    enableCache: boolean;
    enableRelay: boolean;
    enableWebsocket: boolean;
    enableWebhook: boolean;
    enableDatabase: boolean;
  };

  // API Server
  api: {
    enabled: boolean;
    port: number;
    host: string;
    enableCors: boolean;
    corsOrigins: string[];
    apiPrefix: string;
  };

  // Modules
  modules: {
    smartHB: {
      enabled: boolean;
      config: {
        queryCooldown: number;
        triggerOnHeartbeat: boolean;
      };
    };
    protocolAdapter: {
      enabled: boolean;
      config: {
        deduplicationWindow: number;
      };
    };
  };

  // Output Modules
  output: {
    mqttRelay: {
      enabled: boolean;
      brokerUrl: string;
      clientId?: string;
      username?: string;
      password?: string;
      reconnectPeriod: number;
      connectTimeout: number;
      keepalive: number;
      qos: 0 | 1 | 2;
      retain: boolean;
      topicPrefix: string;
      includeDeviceType: boolean;
    };
    webSocket: {
      enabled: boolean;
      port: number;
      host: string;
      path: string;
      heartbeatInterval: number;
      maxClients: number;
      perMessageDeflate: boolean;
    };
    webhook: {
      enabled: boolean;
      endpoints: Array<{
        id: string;
        url: string;
        enabled: boolean;
        secret?: string;
        headers?: Record<string, string>;
        filter?: {
          deviceIds?: string[];
          deviceTypes?: string[];
          suoTypes?: string[];
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
      }>;
      defaultRetryConfig: {
        maxRetries: number;
        retryDelay: number;
        timeout: number;
      };
      maxConcurrentRequests: number;
    };
  };
}

/**
 * Parse webhook endpoints from environment variable
 * Expected format: JSON array of endpoint objects
 * Example: [{"id":"endpoint1","url":"https://example.com/webhook","enabled":true}]
 */
function parseWebhookEndpoints(
  envValue: string | undefined
): AppConfig['output']['webhook']['endpoints'] {
  if (!envValue) {
    return [];
  }

  try {
    const endpoints = JSON.parse(envValue);
    if (Array.isArray(endpoints)) {
      return endpoints.map((ep: any) => ({
        id: ep.id || `endpoint-${Date.now()}`,
        url: ep.url,
        enabled: ep.enabled !== false,
        secret: ep.secret,
        headers: ep.headers,
        filter: ep.filter,
        retryConfig: {
          maxRetries: ep.retryConfig?.maxRetries || 3,
          retryDelay: ep.retryConfig?.retryDelay || 1000,
          timeout: ep.retryConfig?.timeout || 10000,
        },
        batchConfig: ep.batchConfig,
      }));
    }
  } catch (error) {
    console.warn('Failed to parse OUTPUT_WEBHOOK_ENDPOINTS:', error);
  }

  return [];
}

/**
 * Load and validate configuration
 */
function loadConfig(): AppConfig {
  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),

    mqtt: {
      brokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
      clientId: process.env.MQTT_CLIENT_ID || `mqtt-middleware-${Date.now()}`,
      username: process.env.MQTT_USERNAME,
      password: process.env.MQTT_PASSWORD,
      reconnectPeriod: parseInt(process.env.MQTT_RECONNECT_PERIOD || '5000', 10),
      connectTimeout: parseInt(process.env.MQTT_CONNECT_TIMEOUT || '30000', 10),
      keepalive: parseInt(process.env.MQTT_KEEPALIVE || '60', 10),
      clean: process.env.MQTT_CLEAN === 'true',
    },

    topics: {
      v5008Upload: process.env.MQTT_TOPIC_V5008_UPLOAD || 'V5008Upload/+/+',
      v5008Download: process.env.MQTT_TOPIC_V5008_DOWNLOAD || 'V5008Download/+/+',
      v6800Upload: process.env.MQTT_TOPIC_V6800_UPLOAD || 'V6800Upload/+/+',
      v6800Download: process.env.MQTT_TOPIC_V6800_DOWNLOAD || 'V6800Download/+/+',
    },

    database: {
      enabled: process.env.DB_ENABLED === 'true',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      username: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'mqtt_middleware',
      connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
    },

    databaseWriter: {
      enabled: process.env.DB_WRITER_ENABLED !== 'false',
      batchSize: parseInt(process.env.DB_WRITER_BATCH_SIZE || '10', 10),
      maxQueueSize: parseInt(process.env.DB_WRITER_MAX_QUEUE || '1000', 10),
      retryCount: parseInt(process.env.DB_WRITER_RETRY_COUNT || '3', 10),
      queueTimeout: parseInt(process.env.DB_WRITER_QUEUE_TIMEOUT || '5000', 10),
    },

    log: {
      level: process.env.LOG_LEVEL || 'info',
      format: process.env.LOG_FORMAT || 'json',
    },

    features: {
      enableCache: process.env.ENABLE_CACHE !== 'false',
      enableRelay: process.env.ENABLE_RELAY !== 'false',
      enableWebsocket: process.env.ENABLE_WEBSOCKET === 'true',
      enableWebhook: process.env.ENABLE_WEBHOOK === 'true',
      enableDatabase: process.env.ENABLE_DATABASE === 'true',
    },

    api: {
      enabled: process.env.API_ENABLED !== 'false',
      port: parseInt(process.env.API_PORT || '3000', 10),
      host: process.env.API_HOST || '0.0.0.0',
      enableCors: process.env.API_ENABLE_CORS !== 'false',
      corsOrigins: (process.env.API_CORS_ORIGINS || '*').split(',').map(o => o.trim()),
      apiPrefix: process.env.API_PREFIX || '/api/v1',
    },

    modules: {
      smartHB: {
        enabled: process.env.MODULE_SMART_HB_ENABLED !== 'false',
        config: {
          queryCooldown: parseInt(process.env.MODULE_SMART_HB_QUERY_COOLDOWN || '300000', 10),
          triggerOnHeartbeat: process.env.MODULE_SMART_HB_TRIGGER_ON_HEARTBEAT !== 'false',
        },
      },
      protocolAdapter: {
        enabled: process.env.MODULE_PROTOCOL_ADAPTER_ENABLED !== 'false',
        config: {
          deduplicationWindow: parseInt(
            process.env.MODULE_PROTOCOL_ADAPTER_DEDUP_WINDOW || '1000',
            10
          ),
        },
      },
    },

    output: {
      mqttRelay: {
        enabled: process.env.OUTPUT_MQTT_RELAY_ENABLED === 'true',
        brokerUrl: process.env.OUTPUT_MQTT_RELAY_URL || 'mqtt://localhost:1884',
        clientId: process.env.OUTPUT_MQTT_RELAY_CLIENT_ID,
        username: process.env.OUTPUT_MQTT_RELAY_USERNAME,
        password: process.env.OUTPUT_MQTT_RELAY_PASSWORD,
        reconnectPeriod: parseInt(process.env.OUTPUT_MQTT_RELAY_RECONNECT_PERIOD || '5000', 10),
        connectTimeout: parseInt(process.env.OUTPUT_MQTT_RELAY_CONNECT_TIMEOUT || '30000', 10),
        keepalive: parseInt(process.env.OUTPUT_MQTT_RELAY_KEEPALIVE || '60', 10),
        qos: parseInt(process.env.OUTPUT_MQTT_RELAY_QOS || '1', 10) as 0 | 1 | 2,
        retain: process.env.OUTPUT_MQTT_RELAY_RETAIN === 'true',
        topicPrefix: process.env.OUTPUT_MQTT_RELAY_TOPIC_PREFIX || 'middleware',
        includeDeviceType: process.env.OUTPUT_MQTT_RELAY_INCLUDE_TYPE !== 'false',
      },
      webSocket: {
        enabled: process.env.OUTPUT_WEBSOCKET_ENABLED === 'true',
        port: parseInt(process.env.OUTPUT_WEBSOCKET_PORT || '3001', 10),
        host: process.env.OUTPUT_WEBSOCKET_HOST || '0.0.0.0',
        path: process.env.OUTPUT_WEBSOCKET_PATH || '/ws',
        heartbeatInterval: parseInt(process.env.OUTPUT_WEBSOCKET_HEARTBEAT || '30000', 10),
        maxClients: parseInt(process.env.OUTPUT_WEBSOCKET_MAX_CLIENTS || '100', 10),
        perMessageDeflate: process.env.OUTPUT_WEBSOCKET_COMPRESSION === 'true',
      },
      webhook: {
        enabled: process.env.OUTPUT_WEBHOOK_ENABLED === 'true',
        endpoints: parseWebhookEndpoints(process.env.OUTPUT_WEBHOOK_ENDPOINTS),
        defaultRetryConfig: {
          maxRetries: parseInt(process.env.OUTPUT_WEBHOOK_MAX_RETRIES || '3', 10),
          retryDelay: parseInt(process.env.OUTPUT_WEBHOOK_RETRY_DELAY || '1000', 10),
          timeout: parseInt(process.env.OUTPUT_WEBHOOK_TIMEOUT || '10000', 10),
        },
        maxConcurrentRequests: parseInt(process.env.OUTPUT_WEBHOOK_MAX_CONCURRENT || '10', 10),
      },
    },
  };
}

/**
 * Validate configuration
 */
function validateConfig(config: AppConfig): void {
  const errors: string[] = [];

  if (!config.mqtt.brokerUrl) {
    errors.push('MQTT_BROKER_URL is required');
  }

  if (config.port < 1 || config.port > 65535) {
    errors.push('PORT must be between 1 and 65535');
  }

  if (config.api.port < 1 || config.api.port > 65535) {
    errors.push('API_PORT must be between 1 and 65535');
  }

  if (config.output.webSocket.port < 1 || config.output.webSocket.port > 65535) {
    errors.push('OUTPUT_WEBSOCKET_PORT must be between 1 and 65535');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

/**
 * Configuration singleton
 */
let config: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (!config) {
    config = loadConfig();
    validateConfig(config);
  }
  return config;
}

export function resetConfig(): void {
  config = null;
}

// Export default config for convenience
export default getConfig();
