/**
 * Stats Routes
 *
 * Routes for system statistics and monitoring
 * - GET /stats - Get overall system statistics
 * - GET /stats/cache - Get cache statistics
 * - GET /stats/mqtt - Get MQTT statistics
 * - GET /stats/database - Get database statistics
 */

import { Router, Request, Response } from 'express';
import { Application } from '../../app';
import { StatsController } from '../controllers/stats-controller';
import { asyncHandler } from '../middleware/async-handler';

export function createStatsRoutes(application: Application): Router {
  const router = Router();
  const controller = new StatsController(application);

  // GET /stats - Get all statistics
  router.get(
    '/',
    asyncHandler((req: Request, res: Response) => controller.getAllStats(req, res))
  );

  // GET /stats/cache - Get cache statistics
  router.get(
    '/cache',
    asyncHandler((req: Request, res: Response) => controller.getCacheStats(req, res))
  );

  // GET /stats/mqtt - Get MQTT statistics
  router.get(
    '/mqtt',
    asyncHandler((req: Request, res: Response) => controller.getMQTTStats(req, res))
  );

  // GET /stats/database - Get database statistics
  router.get(
    '/database',
    asyncHandler((req: Request, res: Response) => controller.getDatabaseStats(req, res))
  );

  return router;
}
