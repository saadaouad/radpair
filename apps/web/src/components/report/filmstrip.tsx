import type { StudyImageResponse } from '@repo/contracts';
import { memo, useMemo, useRef, useState } from 'react';

import {
  beginStudyImageDrag,
  endStudyImageDrag,
  writeStudyImageDrag
} from '@/components/report/study-image-drag.ts';
import { cn } from '@/lib/utils.ts';

export const Filmstrip = memo(function Filmstrip({
  images,
  selectedId,
  placedIds,
  readOnly,
  onSelect,
  onExpand
}: {
  images: StudyImageResponse[];
  selectedId: string | null;
  placedIds: string[];
  readOnly: boolean;
  onSelect: (imageId: string) => void;
  onExpand: (imageId: string) => void;
}) {
  const skipClick = useRef(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const placed = useMemo(() => new Set(placedIds), [placedIds]);

  return (
    <ul
      aria-label="Study images"
      className="flex gap-2 overflow-x-auto pb-1 lg:sticky lg:top-4 lg:flex-col lg:overflow-visible lg:pb-0"
    >
      {images.map((image) => {
        const selected = image.id === selectedId;
        const placedHere = placed.has(image.id);
        const draggable = !readOnly && !placedHere;
        return (
          <li className="w-24 shrink-0" key={image.id}>
            <button
              aria-pressed={selected}
              className={cn(
                'relative block size-24 overflow-hidden rounded-lg border bg-muted',
                selected && 'ring-2 ring-ring',
                draggable && 'cursor-grab active:cursor-grabbing',
                draggingId === image.id && 'opacity-60'
              )}
              draggable={draggable}
              onClick={() => {
                if (skipClick.current) {
                  return;
                }
                onSelect(image.id);
                onExpand(image.id);
              }}
              onDragEnd={() => {
                endStudyImageDrag();
                setDraggingId(null);
                window.setTimeout(() => {
                  skipClick.current = false;
                }, 0);
              }}
              onDragStart={(event) => {
                skipClick.current = true;
                setDraggingId(image.id);
                beginStudyImageDrag(image.id);
                writeStudyImageDrag(event.dataTransfer, image.id);
              }}
              type="button"
            >
              <img
                alt=""
                className="pointer-events-none size-full object-cover"
                draggable={false}
                src={image.thumbnailUrl}
              />
              <span className="absolute top-1 left-1 rounded bg-background/90 px-1 text-xs font-medium">
                {image.position}
              </span>
              <span className="sr-only">
                Image {image.position}
                {placedHere ? ', already in the report' : draggable ? ', drag into the report' : ''}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
});
