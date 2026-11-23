import express from 'express';
import prisma from './db/prisma.js';
import { corsMiddleware } from './middleware/cors.middleware.js';
import {
  globalErrorHandler,
  notFoundHandler,
} from './middleware/error.middleware.js';
import authRouter from './modules/auth/auth.routes.js';
import bookmarksRouter from './modules/bookmarks/bookmarks.routes.js';
import notesRouter from './modules/notes/notes.routes.js';
import problemsRouter from './modules/problems/problems.routes.js';
import submissionsRouter from './modules/submissions/submissions.routes.js';
import usersRouter from './modules/users/users.routes.js';

const app = express();

app.use(corsMiddleware);
app.use(express.json());

app.get('/api/v1/health/db', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'success',
      message: 'Database is connected',
    });
  } catch (error: unknown) {
    console.error('Database health check failed:', error);
    res.status(503).json({
      status: 'error',
      message: 'Database is unavailable',
    });
  }
});

app.get('/api/v1/health', (_req, res) => {
  res.json({
    status: 'success',
    message: 'Server is running',
  });
});

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/problems', problemsRouter);
app.use('/api/v1/bookmarks', bookmarksRouter);
app.use('/api/v1/notes', notesRouter);
app.use('/api/v1/submissions', submissionsRouter);

app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
