/**
 * REST API Server
 *
 * Express-based HTTP API for the MQTT Middleware
 * Provides endpoints to query device state, send commands, and monitor system health
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { Logger } from '../utils/logger';
import { Application } from '../app';
import { createDeviceRoutes } from './routes/devices';
import { createCommandRoutes } from './routes/commands';
import { createStatsRoutes } from './routes/stats';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

export interface APIServerConfig {
  enabled: boolean;
  port: number;
  host: string;
  corsOrigins: string[];
  enableCors: boolean;
  apiPrefix: string;
}

export class APIServer {
  private app: Express;
  private config: APIServerConfig;
  private logger: Logger;
  private application: Application;
  private server: ReturnType<Express['listen']> | null = null;
  private isRunning: boolean = false;

  constructor(config: APIServerConfig, application: Application) {
    this.config = config;
    this.application = application;
    this.logger = new Logger('APIServer');
    this.app = express();

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // Security headers
    this.app.use(
      helmet({
        contentSecurityPolicy: false, // Disable for API-only server
      })
    );

    // CORS
    if (this.config.enableCors) {
      this.app.use(
        cors({
          origin: (origin, callback) => {
            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin) return callback(null, true);

            // Allow all origins in development
            if (this.config.corsOrigins.includes('*')) {
              return callback(null, true);
            }

            // Check if origin is allowed
            if (this.config.corsOrigins.includes(origin)) {
              return callback(null, true);
            }

            callback(new Error('Not allowed by CORS'));
          },
          methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
          allowedHeaders: ['Content-Type', 'Authorization'],
          credentials: true,
        })
      );
    }

    // Compression
    this.app.use(compression());

    // JSON body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use(requestLogger);
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    const prefix = this.config.apiPrefix;
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    // Health check endpoint (no prefix)
    this.app.get('/health', this.handleHealthCheck.bind(this));

    // Monitor - serve static HTML (lightweight monitoring interface)
    this.app.get('/monitor', (req: Request, res: Response) => {
      res.sendFile(join(__dirname, '../monitor/index.html'));
    });

    // API routes
    this.app.use(`${prefix}/devices`, createDeviceRoutes(this.application));
    this.app.use(`${prefix}/commands`, createCommandRoutes(this.application));
    this.app.use(`${prefix}/stats`, createStatsRoutes(this.application));

    // 404 handler for undefined routes
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`,
      });
    });
  }

  /**
   * Setup error handling middleware
   */
  private setupErrorHandling(): void {
    this.app.use(errorHandler);
  }

  /**
   * Health check handler
   */
  private handleHealthCheck(req: Request, res: Response): void {
    const mqttStatus = this.application.getMQTTStatus();
    const cacheStats = this.application.getCacheStats();
    const dbStatus = this.application.getDatabase().isDatabaseConnected();

    const health = {
      success: true,
      timestamp: new Date().toISOString(),
      status: 'healthy',
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      services: {
        mqtt: {
          connected: mqttStatus.isConnected,
          broker: mqttStatus.brokerUrl,
          reconnectCount: mqttStatus.reconnectAttempts,
        },
        cache: {
          enabled: cacheStats.maxSize > 0,
          size: cacheStats.size,
          maxSize: cacheStats.maxSize,
          hitRate: this.calculateHitRate(cacheStats),
        },
        database: {
          connected: dbStatus,
        },
        application: {
          running: this.application.isAppRunning(),
        },
      },
    };

    // Determine overall status
    const allServicesHealthy = mqttStatus.isConnected && dbStatus;
    health.status = allServicesHealthy ? 'healthy' : 'degraded';

    res.status(allServicesHealthy ? 200 : 503).json(health);
  }

  /**
   * Calculate cache hit rate
   */
  private calculateHitRate(stats: { hitCount: number; missCount: number }): number {
    const total = stats.hitCount + stats.missCount;
    if (total === 0) return 0;
    return Math.round((stats.hitCount / total) * 100 * 100) / 100;
  }

  /**
   * Start the API server
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('API Server is already running');
      return;
    }

    if (!this.config.enabled) {
      this.logger.info('API Server is disabled');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.config.port, this.config.host, () => {
          this.isRunning = true;
          this.logger.info(`API Server started on http://${this.config.host}:${this.config.port}`);
          this.logger.info(`API endpoints available at ${this.config.apiPrefix}`);
          resolve();
        });

        this.server.on('error', (error: Error) => {
          this.logger.error('Failed to start API Server', {
            error: error.message,
          });
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the API server
   */
  async stop(): Promise<void> {
    if (!this.isRunning || !this.server) {
      return;
    }

    return new Promise(resolve => {
      this.logger.info('Stopping API Server...');

      this.server!.close(() => {
        this.isRunning = false;
        this.logger.info('API Server stopped');
        resolve();
      });
    });
  }

  /**
   * Check if server is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get Express app instance (for testing)
   */
  getApp(): Express {
    return this.app;
  }
}
