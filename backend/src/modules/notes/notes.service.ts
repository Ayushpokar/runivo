import { Prisma } from '../../generated/prisma/client.js';
import {
  notesRepository,
  NotesRepository,
  type NoteItem,
} from './notes.repository.js';

export class NoteError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'NoteError';
    this.statusCode = statusCode;
  }
}

export class NotesService {
  private readonly repository: NotesRepository;

  constructor(repository: NotesRepository = notesRepository) {
    this.repository = repository;
  }

  async getUserNotes(userId: bigint): Promise<NoteItem[]> {
    return this.repository.findByUserId(userId);
  }

  async getNote(userId: bigint, problemId: bigint): Promise<NoteItem> {
    const note = await this.repository.findNote(userId, problemId);
    if (!note) {
      throw new NoteError(404, 'Note not found');
    }
    return note;
  }

  async upsertNote(
    userId: bigint,
    problemId: bigint,
    notesDescription: string
  ): Promise<NoteItem> {
    try {
      return await this.repository.upsertNote(
        userId,
        problemId,
        notesDescription
      );
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new NoteError(404, 'User or problem not found');
      }
      throw error;
    }
  }

  async deleteNote(userId: bigint, problemId: bigint): Promise<void> {
    const existing = await this.repository.findNote(userId, problemId);
    if (!existing) {
      throw new NoteError(404, 'Note not found');
    }

    try {
      await this.repository.deleteNote(userId, problemId);
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NoteError(404, 'Note not found');
      }
      throw error;
    }
  }
}

export const notesService = new NotesService();
