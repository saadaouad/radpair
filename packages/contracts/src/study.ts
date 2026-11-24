import { z } from 'zod';

export const reportStatusSchema = z.enum(['unread', 'draft', 'signed']);

export const studySchema = z.object({
  id: z.string().uuid(),
  patientName: z.string(),
  patientReference: z.string(),
  modality: z.string(),
  bodyPart: z.string(),
  performedAt: z.string().datetime(),
  status: reportStatusSchema,
  reportId: z.string().uuid().nullable()
});

export const studyListSchema = z.object({
  studies: z.array(studySchema)
});

export const studyImageSchema = z.object({
  id: z.string().uuid(),
  studyId: z.string().uuid(),
  url: z.string(),
  thumbnailUrl: z.string(),
  position: z.number().int().positive()
});

export const studyImageListSchema = z.object({
  images: z.array(studyImageSchema)
});

export const reportNodeSchema = z
  .object({
    type: z.string()
  })
  .passthrough();

export const reportSchema = z.object({
  id: z.string().uuid(),
  studyId: z.string().uuid(),
  content: reportNodeSchema,
  version: z.number().int().positive(),
  status: reportStatusSchema,
  signedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const reportRevisionSchema = z.object({
  id: z.string().uuid(),
  reportId: z.string().uuid(),
  version: z.number().int().positive(),
  content: reportNodeSchema,
  createdAt: z.string().datetime()
});

export const reportHistorySchema = z.object({
  revisions: z.array(reportRevisionSchema)
});

export const idParamsSchema = z.object({
  id: z.string().uuid()
});

export const updateReportBodySchema = z
  .object({
    content: z.unknown(),
    expectedVersion: z.number().int().positive()
  })
  .strict();

export const signReportBodySchema = z
  .object({
    expectedVersion: z.number().int().positive()
  })
  .strict();

export type StudyResponse = z.infer<typeof studySchema>;
export type StudyImageResponse = z.infer<typeof studyImageSchema>;
export type ReportResponse = z.infer<typeof reportSchema>;
export type ReportRevisionResponse = z.infer<typeof reportRevisionSchema>;
