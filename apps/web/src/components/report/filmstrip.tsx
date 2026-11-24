import type { StudyImageResponse } from '@repo/contracts';

import { Button } from '@/components/ui/button.tsx';
import { cn } from '@/lib/utils.ts';

export const Filmstrip = ({
  images,
  selectedId,
  placedIds,
  onSelect,
  onExpand
}: {
  images: StudyImageResponse[];
  selectedId: string | null;
  placedIds: string[];
  onSelect: (imageId: string) => void;
  onExpand: (imageId: string) => void;
}) => {
  return (
    <ul
      aria-label="Study images"
      className="flex gap-2 overflow-x-auto pb-1 lg:sticky lg:top-4 lg:flex-col lg:overflow-visible lg:pb-0"
    >
      {images.map((image) => {
        const selected = image.id === selectedId;
        const placed = placedIds.includes(image.id);
        return (
          <li className="w-24 shrink-0 space-y-1" key={image.id}>
            <button
              aria-pressed={selected}
              className={cn(
                'relative block size-24 overflow-hidden rounded-lg border bg-muted',
                selected && 'ring-2 ring-ring'
              )}
              onClick={() => onSelect(image.id)}
              type="button"
            >
              <img alt="" className="size-full object-cover" src={image.thumbnailUrl} />
              <span className="absolute top-1 left-1 rounded bg-background/90 px-1 text-xs font-medium">
                {image.position}
              </span>
              <span className="sr-only">
                Image {image.position}
                {placed ? ', already in the report' : ''}
              </span>
            </button>
            <Button
              className="w-full"
              onClick={() => onExpand(image.id)}
              size="sm"
              type="button"
              variant="outline"
            >
              View
            </Button>
          </li>
        );
      })}
    </ul>
  );
};
