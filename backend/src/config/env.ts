import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load root .env first, then backend/.env as fallback
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  POSTGRES_USER: z.string().min(1, 'POSTGRES_USER is required'),
  POSTGRES_PASSWORD: z.string().min(1, 'POSTGRES_PASSWORD is required'),
  POSTGRES_DB: z.string().min(1, 'POSTGRES_DB is required'),
  POSTGRES_HOST: z.string().min(1).default('localhost'),
  DB_PORT: z.coerce.number().int().positive().default(5433),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z
    .string()
    .min(8)
    .default('runivo-dev-secret-change-in-production'),
  CORS_ORIGIN: z.string().default('*'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error(
    'Invalid environment variables:',
    parsedEnv.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
  );
  throw new Error('Failed to validate environment variables');
}

export const env = parsedEnv.data;
export default env;
