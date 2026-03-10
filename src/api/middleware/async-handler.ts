/**
 * Async Handler Middleware
 *
 * Wraps async route handlers to catch errors and pass them to error handler
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Async handler wrapper
 * Automatically catches errors in async route handlers
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void | Response>
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
