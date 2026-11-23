import { Pool } from 'pg';
import env from '../config/env.js';

const pool = new Pool({
  user: env.POSTGRES_USER,
  host: env.POSTGRES_HOST,
  database: env.POSTGRES_DB,
  password: env.POSTGRES_PASSWORD,
  port: env.DB_PORT,
});

export default pool;
