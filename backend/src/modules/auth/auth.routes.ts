import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { authController } from './auth.controller.js';

const authRouter = Router();

authRouter.post('/register', authController.register);
authRouter.post('/login', authController.login);
authRouter.get('/me', requireAuth, authController.me);

export default authRouter;
