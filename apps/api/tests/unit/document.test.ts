import { parseReportDocument, ReportDocumentError } from '@repo/contracts';
import { describe, expect, it } from 'vitest';

import { keyImageDocument, nestedList, paragraphDocument } from '../mocks/documents.ts';

const kneeImageId = '20000000-0000-4000-8000-000000000061';

describe('parseReportDocument', () => {
  it('accepts text, a heading, and one key image', () => {
    const parsed = parseReportDocument({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Findings' }] },
        {
          type: 'keyImage',
          attrs: { imageId: kneeImageId, caption: 'Edema in the lateral femoral condyle' }
        }
      ]
    });

    expect(parsed.imageIds).toEqual([kneeImageId]);
    expect(parsed.hasText).toBe(true);
  });

  it('rejects an unknown node, a deep tree, and a repeated image', () => {
    expect(() => parseReportDocument({ type: 'doc', content: [{ type: 'table' }] })).toThrow(
      ReportDocumentError
    );
    expect(() => parseReportDocument({ type: 'doc', content: [nestedList(8)] })).toThrow(
      /nested too deeply/
    );

    expect(() =>
      parseReportDocument({
        type: 'doc',
        content: [
          ...(keyImageDocument(kneeImageId, 'One').content ?? []),
          ...(keyImageDocument(kneeImageId, 'Two').content ?? [])
        ]
      })
    ).toThrow(/once/);
  });

  it('treats an empty paragraph as having no substance', () => {
    const parsed = parseReportDocument(paragraphDocument('   '));
    expect(parsed.hasText).toBe(false);
    expect(parsed.imageIds).toEqual([]);
  });
});
