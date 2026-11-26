import { Fragment } from '@tiptap/pm/model';
import type { Editor, ReactNodeViewProps } from '@tiptap/react';
import { NodeViewWrapper } from '@tiptap/react';
import { useMemo, useState } from 'react';

import type { KeyImageOptions } from '@/components/report/key-image.ts';
import { Button } from '@/components/ui/button.tsx';
import { cn } from 'cn';

const moveKeyImage = (editor: Editor, pos: number, direction: -1 | 1) => {
  const { state } = editor;
  const node = state.doc.nodeAt(pos);
  if (node?.type.name !== 'keyImage') {
    return false;
  }

  const resolved = state.doc.resolve(pos);
  const index = resolved.index();
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= resolved.parent.childCount) {
    return false;
  }

  const sibling = resolved.parent.child(nextIndex);
  const start = direction === 1 ? pos : pos - sibling.nodeSize;
  const end = direction === 1 ? pos + node.nodeSize + sibling.nodeSize : pos + node.nodeSize;
  const swapped = direction === 1 ? [sibling, node] : [node, sibling];
  editor.view.dispatch(
    state.tr.replaceWith(start, end, Fragment.fromArray(swapped)).scrollIntoView()
  );
  return true;
};

const maxCaptionLength = 240;

export const KeyImageView = ({
  node,
  editor,
  getPos,
  updateAttributes,
  deleteNode,
  selected,
  extension
}: ReactNodeViewProps) => {
  const images = (extension.options as KeyImageOptions).images;
  const imageId = typeof node.attrs.imageId === 'string' ? node.attrs.imageId : '';
  const caption = typeof node.attrs.caption === 'string' ? node.attrs.caption : '';
  const imagesById = useMemo(() => new Map(images.map((item) => [item.id, item])), [images]);
  const image = imagesById.get(imageId);
  const [, refresh] = useState(0);
  const position = typeof getPos === 'function' ? getPos() : undefined;
  let canMoveUp = false;
  let canMoveDown = false;

  if (typeof position === 'number') {
    const resolved = editor.state.doc.resolve(position);
    const index = resolved.index();
    canMoveUp = index > 0;
    canMoveDown = index < resolved.parent.childCount - 1;
  }

  const move = (direction: -1 | 1) => {
    const current = typeof getPos === 'function' ? getPos() : undefined;
    if (typeof current !== 'number') {
      return;
    }
    if (moveKeyImage(editor, current, direction)) {
      refresh((count) => count + 1);
    }
  };

  return (
    <NodeViewWrapper
      className={cn(
        'my-3 scroll-mb-24 rounded-xl border bg-background p-3 lg:scroll-mb-0',
        selected && 'ring-2 ring-ring'
      )}
      data-key-image=""
    >
      <div className="flex gap-3">
        <div
          className={cn(
            'size-24 shrink-0',
            editor.isEditable && 'cursor-grab active:cursor-grabbing'
          )}
          data-drag-handle={editor.isEditable ? '' : undefined}
        >
          {image ? (
            <img
              alt=""
              className="size-full rounded-lg bg-muted object-cover"
              draggable={false}
              src={image.url}
            />
          ) : (
            <div className="flex size-full items-center justify-center rounded-lg bg-muted px-2 text-center text-xs text-muted-foreground">
              Image unavailable
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <label
            className="text-xs font-medium text-muted-foreground"
            htmlFor={`caption-${imageId}`}
          >
            Caption
          </label>
          <input
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
            disabled={!editor.isEditable}
            id={`caption-${imageId}`}
            maxLength={maxCaptionLength}
            onChange={(event) => updateAttributes({ caption: event.target.value })}
            onKeyDown={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
            value={caption}
          />
          {editor.isEditable ? (
            <div className="flex flex-wrap gap-1">
              <Button
                disabled={!canMoveUp}
                onClick={() => move(-1)}
                size="sm"
                type="button"
                variant="outline"
              >
                Up
              </Button>
              <Button
                disabled={!canMoveDown}
                onClick={() => move(1)}
                size="sm"
                type="button"
                variant="outline"
              >
                Down
              </Button>
              <Button onClick={deleteNode} size="sm" type="button" variant="outline">
                Remove
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </NodeViewWrapper>
  );
};
