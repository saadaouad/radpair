import {
  apiErrorSchema,
  reportSchema,
  studyImageListSchema,
  type ReportResponse,
  type StudyImageResponse
} from '@repo/contracts';

import { apiUrl } from '@/lib/api.ts';

export class ReportSaveError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ReportSaveError';
    this.status = status;
  }
}

export const fetchStudyImages = async (studyId: string): Promise<StudyImageResponse[]> => {
  const response = await fetch(`${apiUrl}/api/studies/${studyId}/images`);
  if (!response.ok) {
    throw new Error('The study images could not be loaded.');
  }

  return studyImageListSchema.parse(await response.json()).images;
};

export const fetchStudyReport = async (studyId: string): Promise<ReportResponse> => {
  const response = await fetch(`${apiUrl}/api/studies/${studyId}/report`);
  if (!response.ok) {
    throw new Error('The report could not be loaded.');
  }

  return reportSchema.parse(await response.json());
};

export const saveReport = async (
  reportId: string,
  content: unknown,
  expectedVersion: number
): Promise<ReportResponse> => {
  const response = await fetch(`${apiUrl}/api/reports/${reportId}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content, expectedVersion })
  });

  if (!response.ok) {
    let message = 'The report could not be saved.';
    try {
      const parsed = apiErrorSchema.safeParse(await response.json());
      if (parsed.success) {
        message = parsed.data.error.message;
      }
    } catch {
      message = 'The report could not be saved.';
    }
    throw new ReportSaveError(message, response.status);
  }

  return reportSchema.parse(await response.json());
};
