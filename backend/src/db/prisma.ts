import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pool from './pool.js';

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export default prisma;