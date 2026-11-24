import {
  hasReportSubstance,
  parseReportDocument,
  ReportDocumentError,
  type ReportNode
} from '@repo/contracts';
import { and, eq, inArray, ne, sql } from 'drizzle-orm';

import { db } from '@/db/connection.ts';
import { reportRevisions, reports, studyImages, type Report } from '@/db/schema.ts';
import { ApiError } from '@/plugins/errorHandler.ts';

type Database = Pick<typeof db, 'select' | 'update' | 'insert'>;

const reportColumns = {
  id: reports.id,
  studyId: reports.studyId,
  content: reports.content,
  version: reports.version,
  status: reports.status,
  signedAt: reports.signedAt,
  createdAt: reports.createdAt,
  updatedAt: reports.updatedAt
};

const explainUnchangedReport = async (tx: Database, reportId: string): Promise<never> => {
  const [current] = await tx.select(reportColumns).from(reports).where(eq(reports.id, reportId));

  if (!current) {
    throw new ApiError(404, 'not_found', 'Report not found.');
  }

  if (current.status === 'signed') {
    throw new ApiError(403, 'report_signed', 'This report is signed and can no longer be changed.');
  }

  throw new ApiError(409, 'version_conflict', 'This report was updated somewhere else.', {
    version: current.version,
    content: current.content,
    status: current.status
  });
};

const assertImagesBelongToStudy = async (tx: Database, studyId: string, imageIds: string[]) => {
  if (imageIds.length === 0) {
    return;
  }

  const rows = await tx
    .select({ id: studyImages.id })
    .from(studyImages)
    .where(and(eq(studyImages.studyId, studyId), inArray(studyImages.id, imageIds)));

  if (rows.length !== imageIds.length) {
    throw new ApiError(400, 'validation_error', 'A key image must belong to this study.');
  }
};

const parseContent = (content: unknown) => {
  try {
    return parseReportDocument(content);
  } catch (error) {
    if (error instanceof ReportDocumentError) {
      throw new ApiError(400, 'validation_error', error.message);
    }
    throw error;
  }
};

const recordRevision = async (tx: Database, report: Report) => {
  await tx.insert(reportRevisions).values({
    reportId: report.id,
    version: report.version,
    content: report.content
  });
};

export const saveReport = async (reportId: string, content: unknown, expectedVersion: number) => {
  const parsed = parseContent(content);

  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: reports.id, studyId: reports.studyId, status: reports.status })
      .from(reports)
      .where(eq(reports.id, reportId));

    if (!existing) {
      throw new ApiError(404, 'not_found', 'Report not found.');
    }

    if (existing.status === 'signed') {
      throw new ApiError(
        403,
        'report_signed',
        'This report is signed and can no longer be changed.'
      );
    }

    await assertImagesBelongToStudy(tx, existing.studyId, parsed.imageIds);

    const [updated] = await tx
      .update(reports)
      .set({
        content: parsed.content as ReportNode,
        version: sql`${reports.version} + 1`,
        status: 'draft',
        updatedAt: new Date()
      })
      .where(
        and(
          eq(reports.id, reportId),
          eq(reports.version, expectedVersion),
          ne(reports.status, 'signed')
        )
      )
      .returning(reportColumns);

    if (!updated) {
      return explainUnchangedReport(tx, reportId);
    }

    await recordRevision(tx, updated);
    return updated;
  });
};

export const signReport = async (reportId: string, expectedVersion: number) => {
  return db.transaction(async (tx) => {
    const [existing] = await tx.select(reportColumns).from(reports).where(eq(reports.id, reportId));

    if (!existing) {
      throw new ApiError(404, 'not_found', 'Report not found.');
    }

    if (existing.status === 'signed') {
      throw new ApiError(403, 'report_signed', 'This report is already signed.');
    }

    const parsed = parseContent(existing.content);
    if (!hasReportSubstance(parsed)) {
      throw new ApiError(
        400,
        'validation_error',
        'A report needs text or a key image before it can be signed.'
      );
    }

    const [updated] = await tx
      .update(reports)
      .set({
        status: 'signed',
        signedAt: new Date(),
        version: sql`${reports.version} + 1`,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(reports.id, reportId),
          eq(reports.version, expectedVersion),
          ne(reports.status, 'signed')
        )
      )
      .returning(reportColumns);

    if (!updated) {
      return explainUnchangedReport(tx, reportId);
    }

    await recordRevision(tx, updated);
    return updated;
  });
};
