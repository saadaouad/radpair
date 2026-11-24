import { healthResponseSchema } from '@repo/schema-validation';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import { pingDatabase } from '@/db/connection.ts';
import { ApiError } from '@/plugins/errorHandler.ts';

export const registerHealthRoute = (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/health',
    {
      schema: {
        response: {
          200: healthResponseSchema
        }
      }
    },
    async () => {
      try {
        await pingDatabase();
      } catch (cause) {
        throw new ApiError(503, 'database_unavailable', 'Database is unavailable', undefined, {
          cause
        });
      }

      return {
        status: 'ok' as const,
        database: 'up' as const,
        timestamp: new Date().toISOString()
      };
    }
  );
};
