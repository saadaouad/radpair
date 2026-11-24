import type { Editor, ReactNodeViewProps } from '@tiptap/react';
import { NodeViewWrapper } from '@tiptap/react';

import type { KeyImageOptions } from '@/components/report/key-image.ts';

const moveKeyImage = (editor: Editor, pos: number, direction: -1 | 1) => {
  const { state } = editor;
  const node = state.doc.nodeAt(pos);
  if (node?.type.name !== 'keyImage') {
    return;
  }

  const resolved = state.doc.resolve(pos);
  const index = resolved.index();
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= resolved.parent.childCount) {
    return;
  }

  const sibling = resolved.parent.child(nextIndex);
  const transaction = state.tr;
  if (direction === 1) {
    transaction.insert(pos + node.nodeSize + sibling.nodeSize, node);
    transaction.delete(pos, pos + node.nodeSize);
  } else {
    transaction.delete(pos, pos + node.nodeSize);
    transaction.insert(pos - sibling.nodeSize, node);
  }

  editor.view.dispatch(transaction.scrollIntoView());
};
import { Button } from '@/components/ui/button.tsx';
import { cn } from '@/lib/utils.ts';

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
  const image = images.find((item) => item.id === imageId);
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
    if (typeof position !== 'number') {
      return;
    }
    moveKeyImage(editor, position, direction);
  };

  return (
    <NodeViewWrapper
      className={cn('my-3 rounded-xl border bg-background p-3', selected && 'ring-2 ring-ring')}
      data-key-image=""
    >
      <div className="flex gap-3">
        {image ? (
          <img
            alt=""
            className="size-24 shrink-0 rounded-lg bg-muted object-cover"
            src={image.url}
          />
        ) : (
          <div className="flex size-24 shrink-0 items-center justify-center rounded-lg bg-muted px-2 text-center text-xs text-muted-foreground">
            Image unavailable
          </div>
        )}
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
