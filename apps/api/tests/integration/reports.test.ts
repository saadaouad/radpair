import { eq, gt, and } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { imageId, reportId, seedStudies } from '@/db/catalog.ts';
import { db } from '@/db/connection.ts';
import { reportRevisions, reports } from '@/db/schema.ts';
import { createApp } from '@/app.ts';

const findings = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'No acute finding.' }]
    }
  ]
};

const restore = async (reference: string) => {
  const entry = seedStudies.find((study) => study.patientReference === reference);
  if (!entry) {
    throw new Error(`Missing seed study ${reference}`);
  }

  const number = reference.slice(-2);
  await db
    .delete(reportRevisions)
    .where(and(eq(reportRevisions.reportId, reportId(number)), gt(reportRevisions.version, 1)));
  await db
    .update(reports)
    .set({
      content: entry.content,
      version: 1,
      status: entry.status,
      signedAt: entry.signedAt ? new Date(entry.signedAt) : null
    })
    .where(eq(reports.id, reportId(number)));
};

describe('report API', () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    app = await createApp();
  });

  afterEach(async () => {
    await restore('REF-01');
    await restore('REF-03');
  });

  afterAll(async () => {
    await app.close();
  });

  it('lists studies in status order and returns images and the report', async () => {
    const list = await app.inject({ method: 'GET', url: '/api/studies' });
    expect(list.statusCode).toBe(200);
    const studies = list.json().studies as Array<{ status: string; id: string; reportId: string }>;
    expect(studies.map((study) => study.status)).toEqual([
      'unread',
      'unread',
      'unread',
      'unread',
      'draft',
      'draft',
      'signed',
      'signed'
    ]);

    const studyId = seedStudies[0]?.id;
    if (!studyId) {
      throw new Error('Missing seed study');
    }

    const study = await app.inject({ method: 'GET', url: `/api/studies/${studyId}` });
    expect(study.statusCode).toBe(200);
    expect(study.json().patientReference).toBe('REF-01');

    const images = await app.inject({ method: 'GET', url: `/api/studies/${studyId}/images` });
    expect(images.statusCode).toBe(200);
    expect(images.json().images).toHaveLength(4);
    expect(images.json().images[0].position).toBe(1);

    const report = await app.inject({ method: 'GET', url: `/api/studies/${studyId}/report` });
    expect(report.statusCode).toBe(200);
    expect(report.json().id).toBe(reportId('01'));
  });

  it('saves a report, rejects a stale version, and keeps the saved document', async () => {
    const first = await app.inject({
      method: 'PUT',
      url: `/api/reports/${reportId('01')}`,
      payload: { content: findings, expectedVersion: 1 }
    });
    expect(first.statusCode).toBe(200);
    expect(first.json()).toMatchObject({ version: 2, status: 'draft' });

    const stale = await app.inject({
      method: 'PUT',
      url: `/api/reports/${reportId('01')}`,
      payload: { content: findings, expectedVersion: 1 }
    });
    expect(stale.statusCode).toBe(409);
    expect(stale.json().error.code).toBe('version_conflict');

    const stored = await app.inject({ method: 'GET', url: `/api/reports/${reportId('01')}` });
    expect(stored.json().version).toBe(2);
    expect(stored.json().content).toMatchObject(findings);

    const history = await app.inject({
      method: 'GET',
      url: `/api/reports/${reportId('01')}/history`
    });
    expect(
      history.json().revisions.map((revision: { version: number }) => revision.version)
    ).toEqual([1, 2]);
  });

  it('rejects a key image from another study and a nested document', async () => {
    const foreignImage = await app.inject({
      method: 'PUT',
      url: `/api/reports/${reportId('01')}`,
      payload: {
        expectedVersion: 1,
        content: {
          type: 'doc',
          content: [
            {
              type: 'keyImage',
              attrs: { imageId: imageId('02', 1), caption: 'Wrong study' }
            }
          ]
        }
      }
    });
    expect(foreignImage.statusCode).toBe(400);
    expect(foreignImage.json().error.code).toBe('validation_error');

    const nested = await app.inject({
      method: 'PUT',
      url: `/api/reports/${reportId('01')}`,
      payload: {
        expectedVersion: 1,
        content: {
          type: 'doc',
          content: [nestedList(8)]
        }
      }
    });
    expect(nested.statusCode).toBe(400);

    const stored = await app.inject({ method: 'GET', url: `/api/reports/${reportId('01')}` });
    expect(stored.json().version).toBe(1);
  });

  it('rejects a malformed body and an oversized body', async () => {
    const malformed = await app.inject({
      method: 'PUT',
      url: `/api/reports/${reportId('01')}`,
      payload: { content: findings, expectedVersion: 'one' }
    });
    expect(malformed.statusCode).toBe(400);
    expect(malformed.json().error.code).toBe('validation_error');

    const oversized = await app.inject({
      method: 'PUT',
      url: `/api/reports/${reportId('01')}`,
      payload: { content: { type: 'doc', blob: 'x'.repeat(300_000) }, expectedVersion: 1 }
    });
    expect(oversized.statusCode).toBe(413);
    expect(oversized.json().error.code).toBe('payload_too_large');
  });

  it('signs a report and then refuses changes', async () => {
    const empty = await app.inject({
      method: 'POST',
      url: `/api/reports/${reportId('03')}/sign`,
      payload: { expectedVersion: 1 }
    });
    expect(empty.statusCode).toBe(400);

    const saved = await app.inject({
      method: 'PUT',
      url: `/api/reports/${reportId('03')}`,
      payload: { content: findings, expectedVersion: 1 }
    });
    expect(saved.statusCode).toBe(200);

    const signed = await app.inject({
      method: 'POST',
      url: `/api/reports/${reportId('03')}/sign`,
      payload: { expectedVersion: 2 }
    });
    expect(signed.statusCode).toBe(200);
    expect(signed.json()).toMatchObject({ status: 'signed', version: 3 });

    const change = await app.inject({
      method: 'PUT',
      url: `/api/reports/${reportId('03')}`,
      payload: { content: findings, expectedVersion: 3 }
    });
    expect(change.statusCode).toBe(403);
    expect(change.json().error.code).toBe('report_signed');

    const again = await app.inject({
      method: 'POST',
      url: `/api/reports/${reportId('03')}/sign`,
      payload: { expectedVersion: 3 }
    });
    expect(again.statusCode).toBe(403);

    const stored = await app.inject({ method: 'GET', url: `/api/reports/${reportId('03')}` });
    expect(stored.json()).toMatchObject({ status: 'signed', version: 3 });
  });

  it('returns not found for a missing study', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/studies/00000000-0000-4000-8000-000000000099'
    });
    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('not_found');
  });
});

const nestedList = (depth: number): unknown => {
  if (depth === 0) {
    return { type: 'paragraph' };
  }

  return {
    type: 'bulletList',
    content: [{ type: 'listItem', content: [nestedList(depth - 1)] }]
  };
};
