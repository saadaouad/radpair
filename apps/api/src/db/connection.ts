import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { postgresSsl } from '@/databaseGuard.ts';
import { env } from '@/env.ts';
import * as schema from '@/db/schema.ts';

const globalForDb = globalThis as unknown as { pool?: Pool; poolClosed?: boolean };

const createPool = () => {
  return new Pool({
    connectionString: env.DATABASE_URL,
    min: env.DATABASE_POOL_MIN,
    max: env.DATABASE_POOL_MAX,
    connectionTimeoutMillis: 10_000,
    ssl: postgresSsl(env.DATABASE_URL)
  });
};

export const pool = globalForDb.pool ?? createPool();

if (env.APP_ENV === 'dev') {
  globalForDb.pool = pool;
}

export const db = drizzle({ client: pool, schema });

export const pingDatabase = async () => {
  await db.execute(sql`select 1`);
};

export const closeDatabase = async () => {
  if (globalForDb.poolClosed) {
    return;
  }

  globalForDb.poolClosed = true;
  await pool.end();

  if (globalForDb.pool === pool) {
    globalForDb.pool = undefined;
  }
};
