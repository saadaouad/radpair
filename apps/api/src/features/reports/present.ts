import type { ReportResponse, ReportRevisionResponse } from '@repo/contracts';

import type { Report, ReportRevision } from '@/db/schema.ts';

export const presentReport = (report: Report): ReportResponse => ({
  id: report.id,
  studyId: report.studyId,
  content: report.content,
  version: report.version,
  status: report.status,
  signedAt: report.signedAt?.toISOString() ?? null,
  createdAt: report.createdAt.toISOString(),
  updatedAt: report.updatedAt.toISOString()
});

export const presentRevision = (revision: ReportRevision): ReportRevisionResponse => ({
  id: revision.id,
  reportId: revision.reportId,
  version: revision.version,
  content: revision.content,
  createdAt: revision.createdAt.toISOString()
});
