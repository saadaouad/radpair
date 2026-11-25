import { idParamsSchema, studyListSchema, studySchema } from '@repo/contracts';
import { eq, sql } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { db } from '@/db/connection.ts';
import { reports, studies } from '@/db/schema.ts';
import { ApiError } from '@/plugins/errorHandler.ts';

const statusRank = sql`case ${reports.status} when 'unread' then 0 when 'draft' then 1 else 2 end`;

const toStudy = (
  study: typeof studies.$inferSelect,
  report: { id: string; status: 'unread' | 'draft' | 'signed' } | null
) => ({
  id: study.id,
  patientName: study.patientName,
  patientReference: study.patientReference,
  modality: study.modality,
  bodyPart: study.bodyPart,
  performedAt: study.performedAt.toISOString(),
  status: report?.status ?? 'unread',
  reportId: report?.id ?? null
});

export const registerStudyRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/studies',
    {
      schema: {
        response: { 200: studyListSchema }
      }
    },
    async () => {
      const rows = await db
        .select({
          study: studies,
          reportId: reports.id,
          reportStatus: reports.status
        })
        .from(studies)
        .leftJoin(reports, eq(reports.studyId, studies.id))
        .orderBy(statusRank, sql`${studies.performedAt} desc`);

      return {
        studies: rows.map((row) =>
          toStudy(
            row.study,
            row.reportId && row.reportStatus ? { id: row.reportId, status: row.reportStatus } : null
          )
        )
      };
    }
  );

  app.get(
    '/studies/:id',
    {
      schema: {
        params: idParamsSchema,
        response: { 200: studySchema }
      }
    },
    async (request) => {
      const [row] = await db
        .select({
          study: studies,
          reportId: reports.id,
          reportStatus: reports.status
        })
        .from(studies)
        .leftJoin(reports, eq(reports.studyId, studies.id))
        .where(eq(studies.id, request.params.id));

      if (!row) {
        throw new ApiError(404, 'not_found', 'Study not found.');
      }

      return toStudy(
        row.study,
        row.reportId && row.reportStatus ? { id: row.reportId, status: row.reportStatus } : null
      );
    }
  );
};
