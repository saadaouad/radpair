import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

import { closeDatabase, db } from '@/db/connection.ts';
import { env } from '@/env.ts';

const migrationsFolder = resolve(dirname(fileURLToPath(import.meta.url)), '../../drizzle');

await migrate(db, { migrationsFolder });
console.log(`Migrations applied for APP_ENV=${env.APP_ENV}`);
await closeDatabase();
