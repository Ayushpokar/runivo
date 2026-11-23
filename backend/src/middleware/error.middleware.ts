import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

interface StatusCodeError extends Error {
  statusCode?: number;
  status?: number;
  type?: string;
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
}

export function globalErrorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({
      status: 'error',
      message: 'Invalid JSON payload in request body',
    });
    return;
  }

  if (error instanceof Error) {
    const statusErr = error as StatusCodeError;
    const code = statusErr.statusCode ?? statusErr.status;
    if (typeof code === 'number' && code >= 400 && code < 600) {
      res.status(code).json({
        status: 'error',
        message: error.message,
      });
      return;
    }
  }

  console.error('Unhandled error:', error);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
  });
}
