import { z } from 'zod';

export const difficultySchema = z.enum(['EASY', 'MEDIUM', 'HARD']);

export type Difficulty = z.infer<typeof difficultySchema>;

export const problemIdParamSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, 'Problem ID must be a positive integer')
    .transform((val) => BigInt(val))
    .refine((val) => val > 0n, 'Problem ID must be greater than 0'),
});

export const listProblemsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  difficulty: difficultySchema.optional(),
  tag: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).optional(),
});

export type ListProblemsQuery = z.infer<typeof listProblemsQuerySchema>;

export const constraintInputSchema = z
  .union([
    z.string().trim().min(1, 'Constraint text cannot be empty'),
    z.object({
      constraint_text: z.string().trim().min(1, 'Constraint text cannot be empty'),
    }),
  ])
  .transform((val) =>
    typeof val === 'string' ? { constraint_text: val } : val
  );

export const exampleInputSchema = z.object({
  example_input: z.string(),
  example_output: z.string(),
  explanation: z.string().nullable().optional(),
  position: z.number().int().min(1).optional(),
});

export const hintInputSchema = z.object({
  hint_description: z.string().trim().min(1, 'Hint description cannot be empty'),
  hint_level: z.number().int().min(1).optional(),
});

export const testCaseInputSchema = z.object({
  input_data: z.string(),
  expected_output: z.string(),
  is_sample: z.boolean().default(false),
  position: z.number().int().min(1).optional(),
});

export const tagInputSchema = z
  .string()
  .trim()
  .min(1, 'Tag name cannot be empty')
  .max(50, 'Tag name must be at most 50 characters')
  .transform((val) => val.toLowerCase());

export const createProblemSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title must be at most 200 characters'),
  difficulty: difficultySchema,
  description: z.string().trim().min(1, 'Description is required'),
  input_format: z.string().nullable().optional(),
  output_format: z.string().nullable().optional(),
  constraints: z.array(constraintInputSchema).optional(),
  examples: z.array(exampleInputSchema).optional(),
  hints: z.array(hintInputSchema).optional(),
  tags: z.array(tagInputSchema).optional(),
  test_cases: z.array(testCaseInputSchema).optional(),
});

export type CreateProblemInput = z.infer<typeof createProblemSchema>;

export const updateProblemSchema = createProblemSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

export type UpdateProblemInput = z.infer<typeof updateProblemSchema>;

