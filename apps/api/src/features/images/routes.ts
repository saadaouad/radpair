import { idParamsSchema, studyImageListSchema } from '@repo/contracts';
import { asc, eq } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { db } from '@/db/connection.ts';
import { studies, studyImages } from '@/db/schema.ts';
import { ApiError } from '@/plugins/errorHandler.ts';

export const registerImageRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/studies/:id/images',
    {
      schema: {
        params: idParamsSchema,
        response: { 200: studyImageListSchema }
      }
    },
    async (request) => {
      const [study] = await db
        .select({ id: studies.id })
        .from(studies)
        .where(eq(studies.id, request.params.id));

      if (!study) {
        throw new ApiError(404, 'not_found', 'Study not found.');
      }

      const images = await db
        .select()
        .from(studyImages)
        .where(eq(studyImages.studyId, request.params.id))
        .orderBy(asc(studyImages.position));

      return { images };
    }
  );
};
