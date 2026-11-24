import { studyListSchema, studySchema, type StudyResponse } from '@repo/contracts';

import { apiUrl } from '@/lib/api.ts';

export const fetchStudies = async (): Promise<StudyResponse[]> => {
  const response = await fetch(`${apiUrl}/api/studies`);
  if (!response.ok) {
    throw new Error('The worklist could not be loaded.');
  }

  return studyListSchema.parse(await response.json()).studies;
};

export const fetchStudy = async (id: string): Promise<StudyResponse> => {
  const response = await fetch(`${apiUrl}/api/studies/${id}`);
  if (response.status === 404) {
    throw new Error('This study is not on the worklist.');
  }
  if (!response.ok) {
    throw new Error('The study could not be loaded.');
  }

  return studySchema.parse(await response.json());
};
