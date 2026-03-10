/**
 * Request Logger Middleware
 *
 * Logs all incoming API requests
 */

import { Request, Response, NextFunction } from 'express';
import { Logger } from '../../utils/logger';

const logger = new Logger('API:Request');

/**
 * Request logger middleware
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  // Capture original end function
  const originalEnd = res.end.bind(res);

  // Override end function to log response
  res.end = function (chunk?: any, encoding?: any, cb?: any): Response {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      path: req.path,
      query: req.query,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('user-agent'),
      ip: req.ip || req.socket.remoteAddress,
    };

    // Log based on status code
    if (res.statusCode >= 500) {
      logger.error('Request failed', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('Request error', logData);
    } else {
      logger.debug('Request completed', logData);
    }

    // Call original end
    return originalEnd(chunk, encoding, cb);
  } as Response['end'];

  next();
}
