import { Fragment } from '@tiptap/pm/model';
import type { Editor, ReactNodeViewProps } from '@tiptap/react';
import { NodeViewWrapper } from '@tiptap/react';
import { ChevronDown, ChevronUp, GripVertical, X } from 'lucide-react';
import { Dialog } from 'radix-ui';
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
  const [viewerOpen, setViewerOpen] = useState(false);
  const [captionFocused, setCaptionFocused] = useState(false);
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

  const showCaptionCount = editor.isEditable && (captionFocused || caption.length > 200);

  const thumbLabel = image ? `View image ${image.position}` : 'View image';

  return (
    <NodeViewWrapper
      className={cn(
        'my-3 w-full max-w-xl scroll-mb-24 rounded-xl border bg-background p-3 lg:max-w-[50%] lg:scroll-mb-0',
        selected && 'bg-muted/30 ring-2 ring-ring'
      )}
      data-key-image=""
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
        <div className="flex min-w-0 items-center gap-1.5">
          {editor.isEditable ? (
            <span
              className="flex shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing"
              data-drag-handle=""
            >
              <GripVertical aria-hidden className="size-4" />
            </span>
          ) : null}
          <span className="text-xs font-medium text-muted-foreground">Key image</span>
        </div>
        {editor.isEditable ? (
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              aria-label="Move image up"
              disabled={!canMoveUp}
              onClick={() => move(-1)}
              className="size-8 p-0"
              size="sm"
              type="button"
              variant="ghost"
            >
              <ChevronUp aria-hidden className="size-4" />
            </Button>
            <Button
              aria-label="Move image down"
              disabled={!canMoveDown}
              onClick={() => move(1)}
              className="size-8 p-0"
              size="sm"
              type="button"
              variant="ghost"
            >
              <ChevronDown aria-hidden className="size-4" />
            </Button>
            <Button
              aria-label="Remove image from report"
              className="size-8 p-0 text-muted-foreground hover:text-destructive"
              onClick={() => deleteNode()}
              size="sm"
              type="button"
              variant="ghost"
            >
              <X aria-hidden className="size-4" />
            </Button>
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex items-start gap-3">
        {image ? (
          <button
            aria-label={thumbLabel}
            className="group relative shrink-0 overflow-hidden rounded-lg bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setViewerOpen(true)}
            type="button"
          >
            <img
              alt=""
              className="h-auto w-24 max-h-24 object-cover"
              draggable={false}
              src={image.thumbnailUrl}
            />
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 text-xs font-medium text-white opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100 group-focus-visible:bg-black/40 group-focus-visible:opacity-100">
              View
            </span>
          </button>
        ) : (
          <div className="flex size-24 shrink-0 items-center justify-center rounded-lg bg-muted px-2 text-center text-xs text-muted-foreground">
            Image unavailable
          </div>
        )}

        {editor.isEditable ? (
          <div className="min-w-0 flex-1 space-y-1">
            <label className="sr-only" htmlFor={`caption-${imageId}`}>
              Caption
            </label>
            <input
              aria-describedby={showCaptionCount ? `caption-count-${imageId}` : undefined}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              id={`caption-${imageId}`}
              maxLength={maxCaptionLength}
              onBlur={() => setCaptionFocused(false)}
              onChange={(event) => updateAttributes({ caption: event.target.value })}
              onFocus={() => setCaptionFocused(true)}
              onKeyDown={(event) => event.stopPropagation()}
              onMouseDown={(event) => event.stopPropagation()}
              placeholder="Caption this finding…"
              value={caption}
            />
            {showCaptionCount ? (
              <p
                className="text-right text-xs text-muted-foreground"
                id={`caption-count-${imageId}`}
              >
                {caption.length}/{maxCaptionLength}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="min-w-0 flex-1 text-sm leading-relaxed">
            {caption.trim() ? (
              caption
            ) : (
              <span className="text-muted-foreground italic">No caption</span>
            )}
          </p>
        )}
      </div>

      {image ? (
        <Dialog.Root onOpenChange={setViewerOpen} open={viewerOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-40 bg-black/70" />
            <Dialog.Content className="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100%-2rem)] w-[min(100%-2rem,56rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-xl bg-background p-4 shadow-lg">
              <div className="flex items-center justify-between gap-3">
                <Dialog.Title className="text-sm font-medium">Image {image.position}</Dialog.Title>
                <Dialog.Close asChild>
                  <Button size="sm" type="button" variant="outline">
                    Close
                  </Button>
                </Dialog.Close>
              </div>
              <Dialog.Description className="sr-only">
                Larger view of key image {image.position}.
              </Dialog.Description>
              <img
                alt={`Series ${image.position}`}
                className="max-h-[70vh] w-full rounded-lg bg-muted object-contain"
                src={image.url}
              />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      ) : null}
    </NodeViewWrapper>
  );
};
