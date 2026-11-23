import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { loginSchema, registerSchema } from './auth.schemas.js';
import { AuthError, AuthService, authService } from './auth.service.js';

function handleControllerError(
  res: Response,
  error: unknown,
  context: string
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

  if (error instanceof AuthError) {
    res.status(error.statusCode).json({
      status: 'error',
      message: error.message,
    });
    return;
  }

  console.error(`Error in ${context}:`, error);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
  });
}

export class AuthController {
  private readonly service: AuthService;

  constructor(service: AuthService = authService) {
    this.service = service;
  }

  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const data = registerSchema.parse(req.body);
      const result = await this.service.register(data);

      res.status(201).json({
        status: 'success',
        data: result,
      });
    } catch (error: unknown) {
      handleControllerError(res, error, 'AuthController.register');
    }
  };

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const data = loginSchema.parse(req.body);
      const result = await this.service.login(data);

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error: unknown) {
      handleControllerError(res, error, 'AuthController.login');
    }
  };

  me = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          status: 'error',
          message: 'Not authenticated',
        });
        return;
      }

      const user = await this.service.getCurrentUser(BigInt(req.user.sub));
      res.status(200).json({
        status: 'success',
        data: user,
      });
    } catch (error: unknown) {
      handleControllerError(res, error, 'AuthController.me');
    }
  };
}

export const authController = new AuthController();
