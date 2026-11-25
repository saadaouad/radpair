import { z } from 'zod';

const apiErrorCodes = [
  'validation_error',
  'payload_too_large',
  'not_found',
  'version_conflict',
  'report_signed',
  'database_unavailable',
  'internal_error'
] as const;

export const apiErrorCodeSchema = z.enum(apiErrorCodes);

export const apiErrorSchema = z.object({
  error: z.object({
    code: apiErrorCodeSchema,
    message: z.string(),
    details: z.unknown().optional()
  })
});

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;
export type ApiErrorBody = z.infer<typeof apiErrorSchema>;
