import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '@/app.ts';

describe('GET /health', () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('reports that postgres is reachable', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: 'ok',
      database: 'up'
    });
  });

  it('returns the shared error shape for an unknown route', async () => {
    const response = await app.inject({ method: 'GET', url: '/missing' });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: {
        code: 'not_found',
        message: 'Not found'
      }
    });
  });
});
