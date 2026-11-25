import {
  apiErrorSchema,
  reportSchema,
  reportStatusSchema,
  studyImageListSchema,
  z,
  type ReportResponse,
  type StudyImageResponse
} from '@repo/contracts';

import { apiUrl } from '@/lib/api.ts';

const conflictSchema = z.object({
  version: z.number().int().positive(),
  content: z.object({ type: z.string() }).passthrough(),
  status: reportStatusSchema
});

export type ReportConflict = z.infer<typeof conflictSchema>;

export class ReportSaveError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly conflict: ReportConflict | null;

  constructor(
    message: string,
    status: number,
    code: string | null = null,
    conflict: ReportConflict | null = null
  ) {
    super(message);
    this.name = 'ReportSaveError';
    this.status = status;
    this.code = code;
    this.conflict = conflict;
  }
}

export const fetchStudyImages = async (studyId: string): Promise<StudyImageResponse[]> => {
  const response = await fetch(`${apiUrl}/api/studies/${studyId}/images`);
  if (!response.ok) {
    throw new Error(
      response.status === 503
        ? 'The database is unavailable.'
        : 'The study images could not be loaded.'
    );
  }

  return studyImageListSchema.parse(await response.json()).images;
};

export const fetchStudyReport = async (studyId: string): Promise<ReportResponse> => {
  const response = await fetch(`${apiUrl}/api/studies/${studyId}/report`);
  if (!response.ok) {
    throw new Error(
      response.status === 503 ? 'The database is unavailable.' : 'The report could not be loaded.'
    );
  }

  return reportSchema.parse(await response.json());
};

const throwForFailedReport = async (response: Response, fallback: string): Promise<never> => {
  let message = fallback;
  let code: string | null = null;
  let conflict: ReportConflict | null = null;
  try {
    const parsed = apiErrorSchema.safeParse(await response.json());
    if (parsed.success) {
      code = parsed.data.error.code;
      message = code === 'internal_error' ? fallback : parsed.data.error.message;
      const details = conflictSchema.safeParse(parsed.data.error.details);
      if (details.success) {
        conflict = details.data;
      }
    }
  } catch {
    message = fallback;
  }
  throw new ReportSaveError(message, response.status, code, conflict);
};

export const saveReport = async (
  reportId: string,
  content: unknown,
  expectedVersion: number,
  options?: { keepalive?: boolean }
): Promise<ReportResponse> => {
  const response = await fetch(`${apiUrl}/api/reports/${reportId}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content, expectedVersion }),
    keepalive: options?.keepalive
  });

  if (!response.ok) {
    await throwForFailedReport(response, 'The report could not be saved.');
  }

  return reportSchema.parse(await response.json());
};

export const signReport = async (
  reportId: string,
  expectedVersion: number
): Promise<ReportResponse> => {
  const response = await fetch(`${apiUrl}/api/reports/${reportId}/sign`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ expectedVersion })
  });

  if (!response.ok) {
    await throwForFailedReport(response, 'The report could not be signed.');
  }

  return reportSchema.parse(await response.json());
};
