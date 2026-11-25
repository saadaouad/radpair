const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

const withHost = (hostname: string, port?: string) => {
  const url = new URL(databaseUrl);
  url.hostname = hostname;
  if (port) {
    url.port = port;
  }
  return url.toString();
};

export const devDatabaseUrl = databaseUrl;

export const testDatabaseUrl = withHost(`test.${new URL(databaseUrl).hostname}`);

export const localDatabaseUrl = withHost('localhost', '5432');
