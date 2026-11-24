import { createApp } from '@/app.ts';
import { env } from '@/env.ts';

const start = async () => {
  const app = await createApp();

  const shutdown = async () => {
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown();
  });
  process.on('SIGTERM', () => {
    void shutdown();
  });

  try {
    await app.listen({
      host: env.HOST,
      port: env.PORT
    });
  } catch (error) {
    await app.close();
    throw error;
  }
};

if (env.NODE_ENV !== 'test') {
  start().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
