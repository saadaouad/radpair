import { apiErrorSchema, reportStatusSchema, z } from '@repo/contracts';

const conflictSchema = z.object({
  version: z.number().int().positive(),
  content: z.object({ type: z.string() }).passthrough(),
  status: reportStatusSchema
});

export type ReportConflict = z.infer<typeof conflictSchema>;

export class ReportSaveError extends Error {
  readonly status: number;
  readonly conflict: ReportConflict | null;

  constructor(message: string, status: number, conflict: ReportConflict | null = null) {
    super(message);
    this.name = 'ReportSaveError';
    this.status = status;
    this.conflict = conflict;
  }
}

export const readSaveError = (error: unknown): ReportSaveError | null => {
  if (error instanceof ReportSaveError) {
    return error;
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    (error as { name?: unknown }).name === 'ReportSaveError' &&
    typeof (error as { status?: unknown }).status === 'number'
  ) {
    return error as ReportSaveError;
  }
  return null;
};

export const throwForFailedReport = async (
  response: Response,
  fallback: string
): Promise<never> => {
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
  throw new ReportSaveError(message, response.status, conflict);
};
