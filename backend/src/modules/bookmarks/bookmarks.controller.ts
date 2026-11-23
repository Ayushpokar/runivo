import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import {
  bookmarkParamsSchema,
  userBookmarksParamSchema,
} from './bookmarks.schemas.js';
import {
  BookmarkError,
  BookmarksService,
  bookmarksService,
} from './bookmarks.service.js';

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

  if (error instanceof BookmarkError) {
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

export class BookmarksController {
  private readonly service: BookmarksService;

  constructor(service: BookmarksService = bookmarksService) {
    this.service = service;
  }

  getUserBookmarks = async (req: Request, res: Response): Promise<void> => {
    try {
      const { user_id } = userBookmarksParamSchema.parse(req.params);
      const bookmarks = await this.service.getUserBookmarks(BigInt(user_id));

      res.status(200).json({
        status: 'success',
        data: bookmarks,
      });
    } catch (error: unknown) {
      handleControllerError(res, error, 'BookmarksController.getUserBookmarks');
    }
  };

  addBookmark = async (req: Request, res: Response): Promise<void> => {
    try {
      const { user_id, problem_id } = bookmarkParamsSchema.parse(req.body);
      const bookmark = await this.service.addBookmark(
        BigInt(user_id),
        BigInt(problem_id)
      );

      res.status(201).json({
        status: 'success',
        data: bookmark,
      });
    } catch (error: unknown) {
      handleControllerError(res, error, 'BookmarksController.addBookmark');
    }
  };

  removeBookmark = async (req: Request, res: Response): Promise<void> => {
    try {
      const { user_id, problem_id } = bookmarkParamsSchema.parse(req.params);
      await this.service.removeBookmark(BigInt(user_id), BigInt(problem_id));

      res.status(200).json({
        status: 'success',
        message: 'Bookmark removed successfully',
      });
    } catch (error: unknown) {
      handleControllerError(res, error, 'BookmarksController.removeBookmark');
    }
  };
}

export const bookmarksController = new BookmarksController();
