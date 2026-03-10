/**
 * Error Handler Middleware
 *
 * Centralized error handling for API requests
 */

import { Request, Response, NextFunction } from 'express';
import { Logger } from '../../utils/logger';

const logger = new Logger('API:ErrorHandler');

export interface APIError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

/**
 * Custom error class for API errors
 */
export class APIException extends Error implements APIError {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: unknown
  ) {
    super(message);
    this.name = 'APIException';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Not Found Error
 */
export class NotFoundError extends APIException {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, 404, 'NOT_FOUND');
  }
}

/**
 * Bad Request Error
 */
export class BadRequestError extends APIException {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'BAD_REQUEST', details);
  }
}

/**
 * Validation Error
 */
export class ValidationError extends APIException {
  constructor(message: string, details?: unknown) {
    super(message, 422, 'VALIDATION_ERROR', details);
  }
}

/**
 * Global error handler middleware
 */
export function errorHandler(
  err: APIError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode ?? 500;
  const code = err.code ?? 'INTERNAL_ERROR';

  // Log error
  if (statusCode >= 500) {
    logger.error('Server error', {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  } else {
    logger.warn('Client error', {
      error: err.message,
      code,
      path: req.path,
      method: req.method,
      statusCode,
    });
  }

  // Send response
  const response: Record<string, unknown> = {
    success: false,
    error: err.message || 'Internal Server Error',
    code,
  };

  // Add details for client errors (4xx)
  if (statusCode < 500 && err.details) {
    response.details = err.details;
  }

  // Add stack trace in development mode
  if (process.env.NODE_ENV === 'development' && err.stack) {
    response.stack = err.stack.split('\n');
  }

  res.status(statusCode).json(response);
}
