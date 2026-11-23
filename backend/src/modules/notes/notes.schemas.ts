import { z } from 'zod';

export const upsertNoteSchema = z.object({
  user_id: z.coerce.number().int().positive(),
  problem_id: z.coerce.number().int().positive(),
  notes_description: z
    .string()
    .max(10000, 'Note must be at most 10,000 characters'),
});

export const noteParamsSchema = z.object({
  user_id: z.coerce.number().int().positive(),
  problem_id: z.coerce.number().int().positive(),
});

export const userNotesParamSchema = z.object({
  user_id: z.coerce.number().int().positive(),
});

export type UpsertNoteInput = z.infer<typeof upsertNoteSchema>;
export type NoteParams = z.infer<typeof noteParamsSchema>;
export type UserNotesParam = z.infer<typeof userNotesParamSchema>;
