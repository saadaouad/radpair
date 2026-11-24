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

const devUrl = 'postgresql://owner:secret@ep-dev.eu-central-1.aws.neon.tech/neondb?sslmode=require';
const testUrl =
  'postgresql://owner:secret@ep-test.eu-central-1.aws.neon.tech/neondb?sslmode=require';

describe('database identity', () => {
  it('treats the same host and database as the same database', () => {
    const withExtraParam = `${devUrl}&application_name=radpair`;
    expect(isSameDatabase(devUrl, withExtraParam)).toBe(true);
  });

  it('treats two Neon projects as different databases', () => {
    expect(isSameDatabase(devUrl, testUrl)).toBe(false);
  });

  it('refuses a test url that points at the dev database', () => {
    expect(() => assertTestDatabaseIsolated(devUrl, devUrl)).toThrow(/Neon test project/);
  });

  it('allows a test url when the dev env file has no database url', () => {
    expect(() => assertTestDatabaseIsolated(testUrl, undefined)).not.toThrow();
  });

  it('uses TLS for cloud urls and skips it for localhost', () => {
    expect(postgresSsl(devUrl)).toEqual({ rejectUnauthorized: false });
    expect(postgresSsl('postgresql://user:pass@localhost:5432/radpair')).toBeUndefined();
  });
});

describe('readEnvValue', () => {
  it('reads a quoted value and ignores comments', () => {
    const directory = mkdtempSync(join(tmpdir(), 'radpair-env-'));
    const file = join(directory, '.env');
    writeFileSync(
      file,
      '# comment\nDATABASE_URL="postgresql://user:pass@localhost:5432/radpair"\n'
    );

    expect(readEnvValue(file, 'DATABASE_URL')).toBe(
      'postgresql://user:pass@localhost:5432/radpair'
    );
    expect(readEnvValue(file, 'MISSING')).toBeUndefined();
  });
});
