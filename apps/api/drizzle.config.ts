import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'drizzle-kit';

const appEnv = process.env.APP_ENV ?? process.env.APP_STAGE ?? 'dev';
const envFile = resolve(
  dirname(fileURLToPath(import.meta.url)),
  appEnv === 'test' ? '.env.test' : '.env'
);

if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(`DATABASE_URL is missing. Set it in ${envFile}`);
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl
  }
});
