import type { Node as ProseNode } from '@tiptap/pm/model';
import type { StudyImageResponse } from '@repo/contracts';
import { mergeAttributes, Node, ReactNodeViewRenderer } from '@tiptap/react';

import { KeyImageView } from '@/components/report/key-image-view.tsx';

export type KeyImageOptions = {
  images: StudyImageResponse[];
};

export const imageIdsInDocument = (doc: ProseNode) => {
  const ids: string[] = [];
  doc.descendants((node) => {
    if (node.type.name === 'keyImage' && typeof node.attrs.imageId === 'string') {
      ids.push(node.attrs.imageId);
    }
  });
  return ids;
};

export const KeyImage = Node.create<KeyImageOptions>({
  name: 'keyImage',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,

  addOptions() {
    return { images: [] };
  },

  addAttributes() {
    return {
      imageId: { default: '' },
      caption: { default: '' }
    };
  },

  parseHTML() {
    return [{ tag: 'figure[data-image-id]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['figure', mergeAttributes({ 'data-image-id': HTMLAttributes.imageId })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(KeyImageView);
  }
});
