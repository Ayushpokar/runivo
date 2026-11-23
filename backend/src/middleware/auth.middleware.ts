import type { NextFunction, Request, Response } from 'express';
import { verifyJwt, type JwtPayload } from '../utils/crypto.js';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      status: 'error',
      message: 'Authentication required. Provide a Bearer token.',
    });
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  const payload = verifyJwt(token);

  if (!payload) {
    res.status(401).json({
      status: 'error',
      message: 'Invalid or expired token',
    });
    return;
  }

  req.user = payload;
  next();
}
