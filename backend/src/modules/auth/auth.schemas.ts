import { z } from 'zod';
import { createUserSchema } from '../users/users.schemas.js';

export const registerSchema = createUserSchema;

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
