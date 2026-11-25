import type { Node as ProseNode } from '@tiptap/pm/model';
import { NodeSelection, TextSelection } from '@tiptap/pm/state';
import type { Editor } from '@tiptap/react';
import type { StudyImageResponse } from '@repo/contracts';
import { mergeAttributes, Node, ReactNodeViewRenderer } from '@tiptap/react';

import { KeyImageView } from '@/components/report/key-image-view.tsx';

export type KeyImageOptions = {
  images: StudyImageResponse[];
};

const selectKeyImageBesideText = (editor: Editor, direction: -1 | 1) => {
  const { state } = editor;
  const { selection } = state;
  if (!(selection instanceof TextSelection) || !selection.empty) {
    return false;
  }

  const { $from } = selection;
  if (!$from.parent.isTextblock || $from.parent.content.size === 0) {
    return false;
  }

  const atEdge =
    direction === -1 ? $from.parentOffset === 0 : $from.parentOffset === $from.parent.content.size;
  if (!atEdge) {
    return false;
  }

  const boundary = direction === -1 ? $from.before() : $from.after();
  const $cut = state.doc.resolve(boundary);
  const neighbor = direction === -1 ? $cut.nodeBefore : $cut.nodeAfter;
  if (neighbor?.type.name !== 'keyImage') {
    return false;
  }

  const position = direction === -1 ? $cut.pos - neighbor.nodeSize : $cut.pos;
  editor.view.dispatch(
    state.tr.setSelection(NodeSelection.create(state.doc, position)).scrollIntoView()
  );
  return true;
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
  priority: 1000,
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

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
  },

  addKeyboardShortcuts() {
    return {
      Backspace: ({ editor }) => selectKeyImageBesideText(editor, -1),
      Delete: ({ editor }) => selectKeyImageBesideText(editor, 1)
    };
  }
});
