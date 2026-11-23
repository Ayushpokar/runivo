import z from 'zod';

export const bookmarkParamsSchema = z.object({
    user_id: z.coerce.number().int().positive(),
    problem_id: z.coerce.number().int().positive()
})

export const userBookmarksParamSchema = z.object({
    user_id: z.coerce.number().int().positive()
})

export type AddBookmarkSchema = z.infer<typeof bookmarkParamsSchema>;
export type UserBookmarksParam = z.infer<typeof userBookmarksParamSchema>;
