import { existsSync, readFileSync } from 'node:fs';

const databaseIdentity = (connectionString: string) => {
  const url = new URL(connectionString);
  return `${url.host}${url.pathname}`;
};

export const isSameDatabase = (left: string, right: string) => {
  try {
    return databaseIdentity(left) === databaseIdentity(right);
  } catch {
    return left.trim() === right.trim();
  }
};

export const assertTestDatabaseIsolated = (testUrl: string, devUrl: string | undefined) => {
  if (!devUrl) {
    return;
  }

  if (isSameDatabase(testUrl, devUrl)) {
    throw new Error(
      'The test database must be different from the dev database. Point apps/api/.env.test at the Neon test project.'
    );
  }
};

export const postgresSsl = (connectionString: string) => {
  if (connectionString.includes('localhost') || connectionString.includes('127.0.0.1')) {
    return undefined;
  }

  return { rejectUnauthorized: false as const };
};

const unquote = (value: string) => {
  const quoted =
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"));

  if (!quoted) {
    return value;
  }

  return value.slice(1, -1);
};

export const readEnvValue = (filePath: string, key: string) => {
  if (!existsSync(filePath)) {
    return undefined;
  }

  const text = readFileSync(filePath, 'utf8');

  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) {
      continue;
    }

    const separator = trimmed.indexOf('=');
    if (separator === -1) {
      continue;
    }

    const name = trimmed.slice(0, separator).trim();
    if (name !== key) {
      continue;
    }

    return unquote(trimmed.slice(separator + 1).trim());
  }

  return undefined;
};
