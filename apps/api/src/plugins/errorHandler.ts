import type { ApiErrorBody, ApiErrorCode } from '@repo/contracts';
import { ZodError } from '@repo/contracts';
import type { FastifyInstance } from 'fastify';

type HttpError = {
  statusCode?: number;
  code?: string;
  message?: string;
  validation?: unknown;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details?: unknown;

  constructor(
    status: number,
    code: ApiErrorCode,
    message: string,
    details?: unknown,
    options?: { cause?: unknown }
  ) {
    super(message, options);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const toErrorBody = (error: unknown): { status: number; body: ApiErrorBody } => {
  if (error instanceof ApiError) {
    return {
      status: error.status,
      body: {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details !== undefined ? { details: error.details } : {})
        }
      }
    };
  }

  if (error instanceof ZodError) {
    return {
      status: 400,
      body: {
        error: {
          code: 'validation_error',
          message: 'Request validation failed',
          details: error.issues
        }
      }
    };
  }

  const candidate = error as HttpError;

  if (candidate.statusCode === 413 || candidate.code === 'FST_ERR_CTP_BODY_TOO_LARGE') {
    return {
      status: 413,
      body: {
        error: {
          code: 'payload_too_large',
          message: 'Request body is too large'
        }
      }
    };
  }

  if (candidate.statusCode === 400 || candidate.validation !== undefined) {
    return {
      status: 400,
      body: {
        error: {
          code: 'validation_error',
          message: 'Request validation failed',
          details: candidate.validation ?? candidate.message
        }
      }
    };
  }

  if (candidate.statusCode === 404) {
    return {
      status: 404,
      body: {
        error: {
          code: 'not_found',
          message: 'Not found'
        }
      }
    };
  }

  return {
    status: 500,
    body: {
      error: {
        code: 'internal_error',
        message: 'Internal Server Error'
      }
    }
  };
};

export const registerErrorHandler = (app: FastifyInstance) => {
  app.setNotFoundHandler((_request, reply) => {
    return reply.code(404).send({
      error: {
        code: 'not_found',
        message: 'Not found'
      }
    });
  });

  app.setErrorHandler((error, request, reply) => {
    const { status, body } = toErrorBody(error);

    if (status >= 500) {
      request.log.error(error);
    } else {
      request.log.warn(error);
    }

    return reply.code(status).send(body);
  });
};
