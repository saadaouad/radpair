import { studyListSchema, studySchema, type StudyResponse } from '@repo/contracts';

import { apiUrl } from '@/lib/api.ts';

const unavailable = (response: Response, fallback: string) => {
  if (response.status === 503) {
    return new Error('The database is unavailable.');
  }
  return new Error(fallback);
};

export const fetchStudies = async (): Promise<StudyResponse[]> => {
  const response = await fetch(`${apiUrl}/api/studies`);
  if (!response.ok) {
    throw unavailable(response, 'The worklist could not be loaded.');
  }

  return studyListSchema.parse(await response.json()).studies;
};

export const fetchStudy = async (id: string): Promise<StudyResponse> => {
  const response = await fetch(`${apiUrl}/api/studies/${id}`);
  if (response.status === 404) {
    throw new Error('This study is not on the worklist.');
  }
  if (!response.ok) {
    throw unavailable(response, 'The study could not be loaded.');
  }

  return studySchema.parse(await response.json());
};
