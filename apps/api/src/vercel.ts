import { createApp } from '@/app.ts';
import type { FastifyInstance, HTTPMethods } from 'fastify';

type VercelRequest = {
  method?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
};

type VercelResponse = {
  status: (code: number) => void;
  setHeader: (name: string, value: string | number | readonly string[]) => void;
  send: (body: string) => void;
};

let app: FastifyInstance | null = null;

const getApp = async () => {
  if (!app) {
    app = await createApp();
  }
  return app;
};

const requestPath = (request: VercelRequest) => {
  const original =
    request.headers?.['x-vercel-original-path'] ?? request.headers?.['x-invoke-path'];
  if (typeof original === 'string' && original.length > 0) {
    return original;
  }
  return request.url ?? '/';
};

const requestHeaders = (headers: VercelRequest['headers']) => {
  const out: Record<string, string> = {};
  if (!headers) {
    return out;
  }
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) {
      continue;
    }
    out[key] = Array.isArray(value) ? value.join(', ') : value;
  }
  return out;
};

export default async function handler(request: VercelRequest, response: VercelResponse) {
  const instance = await getApp();
  const url = requestPath(request);
  const method = (request.method ?? 'GET').toUpperCase() as HTTPMethods;
  const payload = request.body as string | object | Buffer | undefined;
  const result = await instance.inject({
    method,
    url,
    headers: requestHeaders(request.headers),
    payload
  });

  response.status(result.statusCode);
  for (const [key, value] of Object.entries(result.headers)) {
    if (value === undefined) {
      continue;
    }
    response.setHeader(key, String(value));
  }
  response.send(typeof result.body === 'string' ? result.body : result.payload);
}
