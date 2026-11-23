import pool from './pool.js';

try {
  const result = await pool.query('SELECT NOW() AS current_time');
  console.log('Database connected:', result.rows[0]);
} catch (error) {
  console.error('Database connection failed:', error);
} finally {
  await pool.end();
}