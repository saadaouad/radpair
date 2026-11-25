import { Fragment, Slice, type Node as ProseNode } from '@tiptap/pm/model';
import { dropPoint } from '@tiptap/pm/transform';
import type { EditorView } from '@tiptap/pm/view';

import { imageIdsInDocument } from '@/components/report/key-image.ts';

export const studyImageDragType = 'application/x-study-image';
const studyImageTextPrefix = 'study-image:';

let activeStudyImageId: string | null = null;

export const beginStudyImageDrag = (imageId: string) => {
  activeStudyImageId = imageId;
};

export const endStudyImageDrag = () => {
  activeStudyImageId = null;
};

const dropClasses = ['ring-2', 'ring-inset', 'ring-ring'] as const;

export const markImageDropTarget = (dom: HTMLElement, active: boolean) => {
  for (const name of dropClasses) {
    dom.classList.toggle(name, active);
  }
};

const readTransferId = (data: DataTransfer | null) => {
  const custom = data?.getData(studyImageDragType);
  if (custom) {
    return custom;
  }
  const text = data?.getData('text/plain') ?? '';
  return text.startsWith(studyImageTextPrefix) ? text.slice(studyImageTextPrefix.length) : '';
};

export const isStudyImageDrag = (event: DragEvent) => {
  if (activeStudyImageId) {
    return true;
  }
  const types = event.dataTransfer?.types;
  return types ? Array.from(types).includes(studyImageDragType) : false;
};

export const writeStudyImageDrag = (data: DataTransfer, imageId: string) => {
  data.setData(studyImageDragType, imageId);
  data.setData('text/plain', `${studyImageTextPrefix}${imageId}`);
  data.effectAllowed = 'copy';
};

const blockInsertPosition = (doc: ProseNode, pos: number, placeAfter: boolean) => {
  const clamped = Math.max(0, Math.min(pos, doc.content.size));
  const resolved = doc.resolve(clamped);
  if (resolved.depth === 0) {
    return clamped;
  }
  return placeAfter ? resolved.after(1) : resolved.before(1);
};

const placeAfterBlock = (view: EditorView, pos: number, clientY: number) => {
  const boundary = blockInsertPosition(view.state.doc, pos, false);
  const dom = view.nodeDOM(boundary);
  if (!(dom instanceof HTMLElement)) {
    return false;
  }
  const rect = dom.getBoundingClientRect();
  return clientY > rect.top + rect.height / 2;
};

export const insertDroppedStudyImage = (
  view: EditorView,
  event: DragEvent,
  imageIds: string[]
): 'inserted' | 'duplicate' | 'rejected' | 'ignored' => {
  const imageId = readTransferId(event.dataTransfer) || activeStudyImageId;
  if (!imageId) {
    return 'ignored';
  }
  if (!imageIds.includes(imageId)) {
    return 'rejected';
  }
  if (imageIdsInDocument(view.state.doc).includes(imageId)) {
    return 'duplicate';
  }

  const keyImage = view.state.schema.nodes.keyImage;
  if (!keyImage) {
    return 'rejected';
  }

  const node = keyImage.create({ imageId, caption: '' });
  let coords: { pos: number } | null = null;
  try {
    coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
  } catch {
    coords = null;
  }
  const near = coords?.pos ?? view.state.doc.content.size;
  const pointed = dropPoint(view.state.doc, near, new Slice(Fragment.from(node), 0, 0));
  const insertAt =
    pointed ??
    blockInsertPosition(
      view.state.doc,
      near,
      coords ? placeAfterBlock(view, near, event.clientY) : false
    );
  view.dispatch(view.state.tr.insert(insertAt, node).scrollIntoView());
  return 'inserted';
};
