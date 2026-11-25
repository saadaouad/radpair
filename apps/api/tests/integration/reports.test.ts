import { eq, gt, and } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { imageId, reportId, seedStudies } from '@/db/catalog.ts';
import { db } from '@/db/connection.ts';
import { reportRevisions, reports } from '@/db/schema.ts';
import { createApp } from '@/app.ts';
import {
  findingsDocument,
  keyImageDocument,
  missingId,
  nestedList,
  paragraphDocument
} from '../mocks/documents.ts';

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
      payload: { content: findingsDocument, expectedVersion: 1 }
    });
    expect(first.statusCode).toBe(200);
    expect(first.json()).toMatchObject({ version: 2, status: 'draft' });

    const stale = await app.inject({
      method: 'PUT',
      url: `/api/reports/${reportId('01')}`,
      payload: { content: findingsDocument, expectedVersion: 1 }
    });
    expect(stale.statusCode).toBe(409);
    expect(stale.json().error.code).toBe('version_conflict');

    const stored = await app.inject({ method: 'GET', url: `/api/reports/${reportId('01')}` });
    expect(stored.json().version).toBe(2);
    expect(stored.json().content).toMatchObject(findingsDocument);

    const history = await app.inject({
      method: 'GET',
      url: `/api/reports/${reportId('01')}/history`
    });
    expect(
      history.json().revisions.map((revision: { version: number }) => revision.version)
    ).toEqual([1, 2]);
  });

  it('keeps one document when two saves use the same version', async () => {
    const left = paragraphDocument('Left tab.');
    const right = paragraphDocument('Right tab.');
    const [first, second] = await Promise.all([
      app.inject({
        method: 'PUT',
        url: `/api/reports/${reportId('01')}`,
        payload: { content: left, expectedVersion: 1 }
      }),
      app.inject({
        method: 'PUT',
        url: `/api/reports/${reportId('01')}`,
        payload: { content: right, expectedVersion: 1 }
      })
    ]);

    const codes = [first.statusCode, second.statusCode].sort();
    expect(codes).toEqual([200, 409]);
    expect(
      [first.json(), second.json()].some((body) => body.error?.code === 'version_conflict')
    ).toBe(true);

    const winner = first.statusCode === 200 ? left : right;
    const stored = await app.inject({ method: 'GET', url: `/api/reports/${reportId('01')}` });
    expect(stored.json().version).toBe(2);
    expect(stored.json().content).toMatchObject(winner);
  });

  it('rejects a key image from another study and a nested document', async () => {
    const foreignImage = await app.inject({
      method: 'PUT',
      url: `/api/reports/${reportId('01')}`,
      payload: {
        expectedVersion: 1,
        content: keyImageDocument(imageId('02', 1), 'Wrong study')
      }
    });
    expect(foreignImage.statusCode).toBe(400);
    expect(foreignImage.json().error).toMatchObject({
      code: 'validation_error',
      message: 'A key image must belong to this study.'
    });

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
    expect(nested.json().error.message).toContain('nested too deeply');

    const stored = await app.inject({ method: 'GET', url: `/api/reports/${reportId('01')}` });
    expect(stored.json().version).toBe(1);
  });

  it('rejects a malformed body and an oversized body', async () => {
    const malformed = await app.inject({
      method: 'PUT',
      url: `/api/reports/${reportId('01')}`,
      payload: { content: findingsDocument, expectedVersion: 'one' }
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
      payload: { content: findingsDocument, expectedVersion: 1 }
    });
    expect(saved.statusCode).toBe(200);

    const stale = await app.inject({
      method: 'POST',
      url: `/api/reports/${reportId('03')}/sign`,
      payload: { expectedVersion: 1 }
    });
    expect(stale.statusCode).toBe(409);
    expect(stale.json().error.code).toBe('version_conflict');

    const signed = await app.inject({
      method: 'POST',
      url: `/api/reports/${reportId('03')}/sign`,
      payload: { expectedVersion: 2 }
    });
    expect(signed.statusCode).toBe(200);
    expect(signed.json()).toMatchObject({ status: 'signed', version: 3 });
    expect(signed.json().signedAt).toEqual(expect.any(String));

    const change = await app.inject({
      method: 'PUT',
      url: `/api/reports/${reportId('03')}`,
      payload: {
        content: paragraphDocument('Changed after sign.'),
        expectedVersion: 3
      }
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
    expect(stored.json()).toMatchObject({
      status: 'signed',
      version: 3,
      signedAt: signed.json().signedAt,
      content: findingsDocument
    });

    const history = await app.inject({
      method: 'GET',
      url: `/api/reports/${reportId('03')}/history`
    });
    expect(history.statusCode).toBe(200);
    expect(history.json().revisions.at(-1)).toMatchObject({
      version: 3,
      content: findingsDocument
    });

    const list = await app.inject({ method: 'GET', url: '/api/studies' });
    const study = (list.json().studies as Array<{ reportId: string; status: string }>).find(
      (item) => item.reportId === reportId('03')
    );
    expect(study?.status).toBe('signed');
  });

  it('returns a stored key image with the study images', async () => {
    const study = seedStudies.find((entry) => entry.patientReference === 'REF-06');
    if (!study) {
      throw new Error('Missing seed study');
    }

    const keyImageId = imageId('06', 1);
    const report = await app.inject({ method: 'GET', url: `/api/studies/${study.id}/report` });
    expect(report.statusCode).toBe(200);
    expect(JSON.stringify(report.json().content)).toContain(keyImageId);

    const images = await app.inject({ method: 'GET', url: `/api/studies/${study.id}/images` });
    expect(images.statusCode).toBe(200);
    expect(images.json().images).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: keyImageId, url: '/studies/mr-knee-1.svg' })
      ])
    );
  });

  it('rejects a broken body, an unknown report, and an invalid id', async () => {
    const broken = await app.inject({
      method: 'PUT',
      url: `/api/reports/${reportId('01')}`,
      headers: { 'content-type': 'application/json' },
      payload: '{'
    });
    expect(broken.statusCode).toBe(400);
    expect(broken.json().error.code).toBe('validation_error');
    expect(JSON.stringify(broken.json())).not.toContain('SyntaxError');

    const missing = missingId;
    const report = await app.inject({ method: 'GET', url: `/api/reports/${missing}` });
    expect(report.statusCode).toBe(404);
    expect(report.json().error).toMatchObject({
      code: 'not_found',
      message: 'Report not found.'
    });

    const update = await app.inject({
      method: 'PUT',
      url: `/api/reports/${missing}`,
      payload: { content: findingsDocument, expectedVersion: 1 }
    });
    expect(update.statusCode).toBe(404);
    expect(update.json().error.code).toBe('not_found');

    const images = await app.inject({ method: 'GET', url: `/api/studies/${missing}/images` });
    expect(images.statusCode).toBe(404);
    expect(images.json().error.message).toBe('Study not found.');

    const invalid = await app.inject({ method: 'GET', url: '/api/studies/not-a-uuid' });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.json().error.code).toBe('validation_error');

    const stored = await app.inject({ method: 'GET', url: `/api/reports/${reportId('01')}` });
    expect(stored.json().version).toBe(1);
  });

  it('returns not found for a missing study', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/studies/${missingId}`
    });
    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('not_found');
  });
});
