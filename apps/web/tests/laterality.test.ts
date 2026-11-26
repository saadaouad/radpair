import { describe, expect, it } from 'vitest';

import {
  checkLaterality,
  checkReportLaterality,
  extractReportPlainText,
  parseStudySide
} from '@/lib/laterality.ts';

describe('parseStudySide', () => {
  it('reads side from the body part label', () => {
    expect(parseStudySide('Left knee')).toBe('left');
    expect(parseStudySide('Right wrist')).toBe('right');
    expect(parseStudySide('Chest')).toBeNull();
  });
});

describe('extractReportPlainText', () => {
  it('includes paragraph text and key image captions', () => {
    const text = extractReportPlainText({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Tear in the medial meniscus.' }]
        },
        {
          type: 'keyImage',
          attrs: { imageId: '00000000-0000-4000-8000-000000000001', caption: 'Right compartment' }
        }
      ]
    });

    expect(text).toContain('Tear in the medial meniscus.');
    expect(text).toContain('Right compartment');
  });
});

describe('checkLaterality', () => {
  it('warns when the opposite side is mentioned', () => {
    const warning = checkLaterality('Left knee', 'Tear in the right medial meniscus.');
    expect(warning?.mentionedSide).toBe('right');
    expect(warning?.studySide).toBe('left');
  });

  it('stays quiet when anatomy does not name the other side', () => {
    expect(checkLaterality('Left knee', 'Marrow edema in the lateral femoral condyle.')).toBeNull();
  });

  it('skips midline studies', () => {
    expect(checkLaterality('Chest', 'Opacity at the right lung base.')).toBeNull();
  });

  it('skips bilateral wording', () => {
    expect(
      checkLaterality('Left knee', 'Bilateral knee pain with more symptoms on the right.')
    ).toBeNull();
  });

  it('checks captions on the document', () => {
    const warning = checkReportLaterality('Left knee', {
      type: 'doc',
      content: [
        {
          type: 'keyImage',
          attrs: {
            imageId: '00000000-0000-4000-8000-000000000001',
            caption: 'Right joint effusion'
          }
        }
      ]
    });
    expect(warning?.mentionedSide).toBe('right');
  });
});
