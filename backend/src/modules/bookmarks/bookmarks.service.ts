import { Prisma } from '../../generated/prisma/client.js';
import {
  bookmarkRepository,
  BookmarksRepository,
  type BookmarkItem,
} from './bookmarks.repository.js';

export class BookmarkError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'BookmarkError';
    this.statusCode = statusCode;
  }
}

export class BookmarksService {
  private readonly repository: BookmarksRepository;

  constructor(repository: BookmarksRepository = bookmarkRepository) {
    this.repository = repository;
  }

  async getUserBookmarks(userId: bigint): Promise<BookmarkItem[]> {
    return this.repository.findByUserId(userId);
  }

  async addBookmark(userId: bigint, problemId: bigint): Promise<BookmarkItem> {
    const existing = await this.repository.findBookmark(userId, problemId);
    if (existing) {
      throw new BookmarkError(409, 'Problem is already bookmarked');
    }

    try {
      return await this.repository.createBookmark(userId, problemId);
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new BookmarkError(409, 'Problem is already bookmarked');
        }
        if (error.code === 'P2003') {
          throw new BookmarkError(404, 'User or problem not found');
        }
      }
      throw error;
    }
  }

  async removeBookmark(userId: bigint, problemId: bigint): Promise<void> {
    const existing = await this.repository.findBookmark(userId, problemId);
    if (!existing) {
      throw new BookmarkError(404, 'Bookmark not found');
    }

    try {
      await this.repository.deleteBookmark(userId, problemId);
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new BookmarkError(404, 'Bookmark not found');
      }
      throw error;
    }
  }
}

export const bookmarksService = new BookmarksService();


