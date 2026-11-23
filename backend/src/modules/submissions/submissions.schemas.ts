import { z } from 'zod';

export const submissionStatusSchema = z.enum([
  'QUEUED',
  'RUNNING',
  'COMPLETED',
  'FAILED',
]);

export const submissionVerdictSchema = z.enum([
  'ACCEPTED',
  'WRONG_ANSWER',
  'RUNTIME_ERROR',
  'TIME_LIMIT_EXCEEDED',
  'COMPILATION_ERROR',
  'INTERNAL_ERROR',
]);

export const supportedLanguageSchema = z.enum([
  'python',
  'javascript',
  'typescript',
  'cpp',
  'c',
  'java',
  'go',
  'rust',
]);

export const createSubmissionSchema = z.object({
  user_id: z.coerce.number().int().positive(),
  problem_id: z.coerce.number().int().positive(),
  source_code: z
    .string()
    .min(1, 'Source code cannot be empty')
    .max(100000, 'Source code is too large'),
  language: supportedLanguageSchema.default('python'),
});

export const submissionIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const userSubmissionsParamSchema = z.object({
  user_id: z.coerce.number().int().positive(),
});

export const listSubmissionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  user_id: z.coerce.number().int().positive().optional(),
  problem_id: z.coerce.number().int().positive().optional(),
  status: submissionStatusSchema.optional(),
  verdict: submissionVerdictSchema.optional(),
  language: supportedLanguageSchema.optional(),
});

export const updateSubmissionResultSchema = z
  .object({
    status: submissionStatusSchema,
    verdict: submissionVerdictSchema.nullable().optional(),
    execution_time_ms: z.number().int().min(0).nullable().optional(),
    memory_used_kb: z.number().int().min(0).nullable().optional(),
  })
  .refine(
    (data) => data.status !== 'COMPLETED' || (data.verdict !== undefined && data.verdict !== null),
    {
      message: 'verdict is required when status is COMPLETED',
      path: ['verdict'],
    }
  );

export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
export type ListSubmissionsQuery = z.infer<typeof listSubmissionsQuerySchema>;
export type UpdateSubmissionResultInput = z.infer<
  typeof updateSubmissionResultSchema
>;
