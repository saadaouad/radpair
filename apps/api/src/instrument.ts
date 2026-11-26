import * as Sentry from '@sentry/node';

const dsn = process.env.SENTRY_DSN;

if (dsn && dsn.length > 0 && process.env.NODE_ENV !== 'test') {
  Sentry.init({
    dsn,
    environment: process.env.APP_ENV ?? 'dev',
    tracesSampleRate: 0
  });
}

export { Sentry };
