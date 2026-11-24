import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider
} from 'fastify-type-provider-zod';

import { closeDatabase } from '@/db/connection.ts';
import { env } from '@/env.ts';
import { registerErrorHandler } from '@/plugins/errorHandler.ts';
import { registerHealthRoute } from '@/routes/health.ts';

export const BODY_LIMIT_BYTES = 256 * 1024;

export const createApp = async () => {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL
    },
    bodyLimit: BODY_LIMIT_BYTES,
    disableRequestLogging: env.NODE_ENV === 'test'
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: env.CORS_ORIGIN,
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS']
  });

  registerErrorHandler(app);
  registerHealthRoute(app);

  app.addHook('onClose', async () => {
    await closeDatabase();
  });

  await app.ready();

  return app;
};
