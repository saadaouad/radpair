import { parseReportDocument, ReportDocumentError } from '@repo/contracts';
import { describe, expect, it } from 'vitest';

const paragraph = (text: string) => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }]
});

const nest = (depth: number): unknown => {
  if (depth === 0) {
    return { type: 'paragraph' };
  }

  return {
    type: 'bulletList',
    content: [{ type: 'listItem', content: [nest(depth - 1)] }]
  };
};

describe('parseReportDocument', () => {
  it('accepts text, a heading, and one key image', () => {
    const imageId = '20000000-0000-4000-8000-000000000061';
    const parsed = parseReportDocument({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Findings' }] },
        {
          type: 'keyImage',
          attrs: { imageId, caption: 'Edema in the lateral femoral condyle' }
        }
      ]
    });

    expect(parsed.imageIds).toEqual([imageId]);
    expect(parsed.hasText).toBe(true);
  });

  it('rejects an unknown node, a deep tree, and a repeated image', () => {
    expect(() => parseReportDocument({ type: 'doc', content: [{ type: 'table' }] })).toThrow(
      ReportDocumentError
    );
    expect(() => parseReportDocument({ type: 'doc', content: [nest(8)] })).toThrow(
      /nested too deeply/
    );

    const imageId = '20000000-0000-4000-8000-000000000061';
    expect(() =>
      parseReportDocument({
        type: 'doc',
        content: [
          { type: 'keyImage', attrs: { imageId, caption: 'One' } },
          { type: 'keyImage', attrs: { imageId, caption: 'Two' } }
        ]
      })
    ).toThrow(/once/);
  });

  it('treats an empty paragraph as having no substance', () => {
    const parsed = parseReportDocument(paragraph('   '));
    expect(parsed.hasText).toBe(false);
    expect(parsed.imageIds).toEqual([]);
  });
});
