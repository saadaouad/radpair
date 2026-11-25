import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  assertTestDatabaseIsolated,
  isSameDatabase,
  postgresSsl,
  readEnvValue
} from '@/databaseGuard.ts';

import { devDatabaseUrl, localDatabaseUrl, testDatabaseUrl } from '../mocks/database.ts';

describe('database identity', () => {
  it('treats the same host and database as the same database', () => {
    const withExtraParam = new URL(devDatabaseUrl);
    withExtraParam.searchParams.set('application_name', 'radpair');
    expect(isSameDatabase(devDatabaseUrl, withExtraParam.toString())).toBe(true);
  });

  it('treats two Neon projects as different databases', () => {
    expect(isSameDatabase(devDatabaseUrl, testDatabaseUrl)).toBe(false);
  });

  it('refuses a test url that points at the dev database', () => {
    expect(() => assertTestDatabaseIsolated(devDatabaseUrl, devDatabaseUrl)).toThrow(
      /Neon test project/
    );
  });

  it('allows a test url when the dev env file has no database url', () => {
    expect(() => assertTestDatabaseIsolated(testDatabaseUrl, undefined)).not.toThrow();
  });

  it('uses TLS for cloud urls and skips it for localhost', () => {
    expect(postgresSsl(devDatabaseUrl)).toEqual({ rejectUnauthorized: false });
    expect(postgresSsl(localDatabaseUrl)).toBeUndefined();
  });
});

describe('readEnvValue', () => {
  it('reads a quoted value and ignores comments', () => {
    const directory = mkdtempSync(join(tmpdir(), 'radpair-env-'));
    const file = join(directory, '.env');
    writeFileSync(file, `# comment\nDATABASE_URL="${localDatabaseUrl}"\n`);

    expect(readEnvValue(file, 'DATABASE_URL')).toBe(localDatabaseUrl);
    expect(readEnvValue(file, 'MISSING')).toBeUndefined();
  });
});
