import {
  idParamsSchema,
  reportHistorySchema,
  reportSchema,
  signReportBodySchema,
  updateReportBodySchema
} from '@repo/contracts';
import { asc, eq } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { db } from '@/db/connection.ts';
import { reportRevisions, reports } from '@/db/schema.ts';
import { ApiError } from '@/plugins/errorHandler.ts';
import { presentReport, presentRevision } from '@/features/reports/present.ts';
import { saveReport, signReport } from '@/features/reports/persist.ts';

const findReport = async (reportId: string) => {
  const [report] = await db.select().from(reports).where(eq(reports.id, reportId));
  if (!report) {
    throw new ApiError(404, 'not_found', 'Report not found.');
  }
  return report;
};

export const registerReportRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/reports/:id',
    {
      schema: {
        params: idParamsSchema,
        response: { 200: reportSchema }
      }
    },
    async (request) => presentReport(await findReport(request.params.id))
  );

  app.get(
    '/studies/:id/report',
    {
      schema: {
        params: idParamsSchema,
        response: { 200: reportSchema }
      }
    },
    async (request) => {
      const [report] = await db
        .select()
        .from(reports)
        .where(eq(reports.studyId, request.params.id));
      if (!report) {
        throw new ApiError(404, 'not_found', 'Report not found.');
      }
      return presentReport(report);
    }
  );

  app.put(
    '/reports/:id',
    {
      schema: {
        params: idParamsSchema,
        body: updateReportBodySchema,
        response: { 200: reportSchema }
      }
    },
    async (request) => {
      const updated = await saveReport(
        request.params.id,
        request.body.content,
        request.body.expectedVersion
      );
      return presentReport(updated);
    }
  );

  app.post(
    '/reports/:id/sign',
    {
      schema: {
        params: idParamsSchema,
        body: signReportBodySchema,
        response: { 200: reportSchema }
      }
    },
    async (request) =>
      presentReport(await signReport(request.params.id, request.body.expectedVersion))
  );

  app.get(
    '/reports/:id/history',
    {
      schema: {
        params: idParamsSchema,
        response: { 200: reportHistorySchema }
      }
    },
    async (request) => {
      await findReport(request.params.id);
      const revisions = await db
        .select()
        .from(reportRevisions)
        .where(eq(reportRevisions.reportId, request.params.id))
        .orderBy(asc(reportRevisions.version));

      return { revisions: revisions.map(presentRevision) };
    }
  );
};
