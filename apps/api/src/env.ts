import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ZodError } from '@repo/schema-validation';

import { assertTestDatabaseIsolated, readEnvValue } from '@/databaseGuard.ts';
import { envSchema, type Env } from '@/envSchema.ts';

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const inferStage = () => {
  const explicit = process.env.APP_STAGE;
  if (explicit === 'dev' || explicit === 'test' || explicit === 'prod') {
    return explicit;
  }

  if (process.env.NODE_ENV === 'production') {
    return 'prod';
  }

  if (process.env.NODE_ENV === 'test') {
    return 'test';
  }

  return 'dev';
};

const failStartup = (message: string): never => {
  console.error(message);
  if (process.env.VITEST) {
    throw new Error(message);
  }
  process.exit(1);
};

const stage = inferStage();
process.env.APP_STAGE = stage;

const envFileName = stage === 'test' ? '.env.test' : stage === 'dev' ? '.env' : undefined;

if (envFileName) {
  const envFile = resolve(apiRoot, envFileName);
  if (!existsSync(envFile)) {
    failStartup(
      `Missing ${envFileName}. Copy apps/api/${envFileName}.example to apps/api/${envFileName} and set the Neon connection string.`
    );
  }
  process.loadEnvFile(envFile);
}

let env: Env;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof ZodError) {
    const lines = error.issues.map((issue) => {
      const path = issue.path.join('.') || 'env';
      return `  ${path}: ${issue.message}`;
    });
    failStartup(`Invalid environment variables:\n${lines.join('\n')}`);
  }
  throw error;
}

if (env.APP_STAGE === 'test') {
  const devUrl = readEnvValue(resolve(apiRoot, '.env'), 'DATABASE_URL');
  try {
    assertTestDatabaseIsolated(env.DATABASE_URL, devUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Test database is not isolated';
    failStartup(message);
  }
}

export { env };
export const isDev = () => env.APP_STAGE === 'dev';
export const isTest = () => env.APP_STAGE === 'test';
export const isProd = () => env.APP_STAGE === 'prod';
