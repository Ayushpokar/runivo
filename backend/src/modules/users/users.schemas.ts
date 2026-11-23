import z from "zod";

export const createUserSchema = z.object({
    username: z.string().min(3, "Username must be at least 3 characters long").max(30, "Username must be at most 30 characters long"),
    name: z.string().min(1, "Name cannot be empty").max(100, "Name must be at most 100 characters long"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters long").max(100, "Password must be at most 100 characters long"),
});

export const userIdParamSchema = z.object({
    id: z.coerce.number().int().positive()
})

export const updateUserSchema = createUserSchema.partial()

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UserIdParam = z.infer<typeof userIdParamSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;