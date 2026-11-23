import type { NextFunction, Request, Response } from 'express';
import env from '../config/env.js';

export function corsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  res.setHeader('Access-Control-Allow-Origin', env.CORS_ORIGIN);
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE, OPTIONS'
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
}
