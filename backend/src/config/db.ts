import { env } from './env.js';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

export const databasePool = new pg.Pool({ connectionString: env.DATABASE_URL });
const adapter = new PrismaPg(databasePool);

const prisma = new PrismaClient({ adapter });

export default prisma;
