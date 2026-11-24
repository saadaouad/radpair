import { ZodError, z } from '@repo/schema-validation';
import { describe, expect, it } from 'vitest';

import { ApiError, toErrorBody } from '@/plugins/errorHandler.ts';

describe('toErrorBody', () => {
  it('keeps the status and code from an ApiError', () => {
    const body = toErrorBody(new ApiError(403, 'report_signed', 'This report is signed'));

    expect(body).toEqual({
      status: 403,
      body: {
        error: {
          code: 'report_signed',
          message: 'This report is signed'
        }
      }
    });
  });

  it('turns a ZodError into a 400 validation error', () => {
    const parsed = z.object({ version: z.number() }).safeParse({ version: 'nope' });
    if (parsed.success) {
      throw new Error('expected a zod failure');
    }

    const body = toErrorBody(new ZodError(parsed.error.issues));

    expect(body.status).toBe(400);
    expect(body.body.error.code).toBe('validation_error');
    expect(body.body.error.details).toBeDefined();
  });

  it('turns an oversized body into a 413', () => {
    const body = toErrorBody({ statusCode: 413, code: 'FST_ERR_CTP_BODY_TOO_LARGE' });

    expect(body).toEqual({
      status: 413,
      body: {
        error: {
          code: 'payload_too_large',
          message: 'Request body is too large'
        }
      }
    });
  });

  it('hides unexpected failures behind a 500', () => {
    const body = toErrorBody(new Error('password=secret'));

    expect(body.status).toBe(500);
    expect(body.body.error.code).toBe('internal_error');
    expect(JSON.stringify(body)).not.toContain('secret');
  });
});
