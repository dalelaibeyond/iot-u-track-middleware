/**
 * Command Routes
 *
 * Routes for sending commands to devices
 * - POST /commands - Send a command to a device
 * - GET /commands/:id - Get command status
 */

import { Router, Request, Response } from 'express';
import { Application } from '../../app';
import { CommandController } from '../controllers/command-controller';
import { asyncHandler } from '../middleware/async-handler';

export function createCommandRoutes(application: Application): Router {
  const router = Router();
  const controller = new CommandController(application);

  // POST /commands - Send a command
  router.post(
    '/',
    asyncHandler((req: Request, res: Response) => controller.sendCommand(req, res))
  );

  // GET /commands/:id - Get command status
  router.get(
    '/:id',
    asyncHandler((req: Request, res: Response) => controller.getCommandStatus(req, res))
  );

  // GET /commands - List pending commands
  router.get(
    '/',
    asyncHandler((req: Request, res: Response) => controller.listPendingCommands(req, res))
  );

  return router;
}
