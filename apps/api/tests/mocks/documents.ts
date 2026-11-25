export const missingId = '00000000-0000-4000-8000-000000000099';

export const paragraphDocument = (text: string) => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }]
});

export const findingsDocument = paragraphDocument('No acute finding.');

export const keyImageDocument = (imageId: string, caption: string) => ({
  type: 'doc',
  content: [{ type: 'keyImage', attrs: { imageId, caption } }]
});

export const nestedList = (depth: number): unknown => {
  if (depth === 0) {
    return { type: 'paragraph' };
  }

  return {
    type: 'bulletList',
    content: [{ type: 'listItem', content: [nestedList(depth - 1)] }]
  };
};
