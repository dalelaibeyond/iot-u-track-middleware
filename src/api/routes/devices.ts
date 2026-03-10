/**
 * Device Routes
 *
 * Routes for device management and queries
 * - GET /devices - List all devices
 * - GET /devices/:id - Get device details
 * - GET /devices/:id/modules - Get device modules
 * - GET /devices/:id/history - Get device history
 */

import { Router, Request, Response, NextFunction } from 'express';
import { Application } from '../../app';
import { DeviceController } from '../controllers/device-controller';
import { asyncHandler } from '../middleware/async-handler';

export function createDeviceRoutes(application: Application): Router {
  const router = Router();
  const controller = new DeviceController(application);

  // GET /devices - List all devices
  router.get(
    '/',
    asyncHandler((req: Request, res: Response) => controller.listDevices(req, res))
  );

  // GET /devices/:id - Get device details
  router.get(
    '/:id',
    asyncHandler((req: Request, res: Response) => controller.getDevice(req, res))
  );

  // GET /devices/:id/modules - Get device modules
  router.get(
    '/:id/modules',
    asyncHandler((req: Request, res: Response) => controller.getDeviceModules(req, res))
  );

  // GET /devices/:id/history - Get device history
  router.get(
    '/:id/history',
    asyncHandler((req: Request, res: Response) => controller.getDeviceHistory(req, res))
  );

  return router;
}
