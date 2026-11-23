import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import {
  noteParamsSchema,
  upsertNoteSchema,
  userNotesParamSchema,
} from './notes.schemas.js';
import { NoteError, NotesService, notesService } from './notes.service.js';

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

  if (error instanceof NoteError) {
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

export class NotesController {
  private readonly service: NotesService;

  constructor(service: NotesService = notesService) {
    this.service = service;
  }

  getUserNotes = async (req: Request, res: Response): Promise<void> => {
    try {
      const { user_id } = userNotesParamSchema.parse(req.params);
      const notes = await this.service.getUserNotes(BigInt(user_id));

      res.status(200).json({
        status: 'success',
        data: notes,
      });
    } catch (error: unknown) {
      handleControllerError(res, error, 'NotesController.getUserNotes');
    }
  };

  getNote = async (req: Request, res: Response): Promise<void> => {
    try {
      const { user_id, problem_id } = noteParamsSchema.parse(req.params);
      const note = await this.service.getNote(
        BigInt(user_id),
        BigInt(problem_id)
      );

      res.status(200).json({
        status: 'success',
        data: note,
      });
    } catch (error: unknown) {
      handleControllerError(res, error, 'NotesController.getNote');
    }
  };

  upsertNote = async (req: Request, res: Response): Promise<void> => {
    try {
      const { user_id, problem_id, notes_description } = upsertNoteSchema.parse(
        req.body
      );
      const note = await this.service.upsertNote(
        BigInt(user_id),
        BigInt(problem_id),
        notes_description
      );

      res.status(200).json({
        status: 'success',
        data: note,
      });
    } catch (error: unknown) {
      handleControllerError(res, error, 'NotesController.upsertNote');
    }
  };

  deleteNote = async (req: Request, res: Response): Promise<void> => {
    try {
      const { user_id, problem_id } = noteParamsSchema.parse(req.params);
      await this.service.deleteNote(BigInt(user_id), BigInt(problem_id));

      res.status(200).json({
        status: 'success',
        message: 'Note deleted successfully',
      });
    } catch (error: unknown) {
      handleControllerError(res, error, 'NotesController.deleteNote');
    }
  };
}

export const notesController = new NotesController();
