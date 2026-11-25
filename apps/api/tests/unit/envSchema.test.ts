import { describe, expect, it } from 'vitest';

import { envSchema } from '@/envSchema.ts';

import { localDatabaseUrl } from '../mocks/database.ts';

describe('envSchema', () => {
  it('applies the local defaults', () => {
    const env = envSchema.parse({ DATABASE_URL: localDatabaseUrl });

    expect(env.NODE_ENV).toBe('development');
    expect(env.APP_ENV).toBe('dev');
    expect(env.PORT).toBe(3001);
    expect(env.DATABASE_POOL_MAX).toBe(3);
    expect(env.CORS_ORIGIN).toEqual(['http://localhost:5173']);
  });

  it('splits a comma-separated CORS list', () => {
    const env = envSchema.parse({
      DATABASE_URL: localDatabaseUrl,
      CORS_ORIGIN: 'http://localhost:5173, https://radpair.vercel.app'
    });

    expect(env.CORS_ORIGIN).toEqual(['http://localhost:5173', 'https://radpair.vercel.app']);
  });

  it('rejects a non-postgres database url', () => {
    const result = envSchema.safeParse({ DATABASE_URL: 'https://example.com/db' });

    expect(result.success).toBe(false);
  });
});
