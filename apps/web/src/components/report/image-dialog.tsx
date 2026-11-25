import type { StudyImageResponse } from '@repo/contracts';
import { Dialog } from 'radix-ui';

import { Button } from '@/components/ui/button.tsx';

export const ImageDialog = ({
  images,
  imageId,
  canInsert,
  onClose,
  onInsert,
  onShow
}: {
  images: StudyImageResponse[];
  imageId: string | null;
  canInsert: boolean;
  onClose: () => void;
  onInsert: () => void;
  onShow: (imageId: string) => void;
}) => {
  const ordered = [...images].sort((left, right) => left.position - right.position);
  const index = ordered.findIndex((image) => image.id === imageId);
  const image = index >= 0 ? ordered[index] : null;

  const show = (nextIndex: number) => {
    const next = ordered[nextIndex];
    if (next) {
      onShow(next.id);
    }
  };

  return (
    <Dialog.Root
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open={image !== null}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/70" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100%-2rem)] w-[min(100%-2rem,56rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-xl bg-background p-4 shadow-lg"
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') {
              event.preventDefault();
              show(index - 1);
            }
            if (event.key === 'ArrowRight') {
              event.preventDefault();
              show(index + 1);
            }
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <Dialog.Title className="text-sm font-medium">
              {image ? `Image ${image.position}` : 'Image'}
            </Dialog.Title>
            <div className="flex gap-2">
              <Button disabled={!canInsert} onClick={onInsert} size="sm" type="button">
                Insert image
              </Button>
              <Dialog.Close asChild>
                <Button size="sm" type="button" variant="outline">
                  Close
                </Button>
              </Dialog.Close>
            </div>
          </div>
          <Dialog.Description className="sr-only">
            Larger view of the study image. Previous and next move through the study images. Insert
            image places the current image in the report.
          </Dialog.Description>
          {image ? (
            <img
              alt={`Series ${image.position}`}
              className="max-h-[70vh] w-full rounded-lg bg-muted object-contain"
              src={image.url}
            />
          ) : null}
          <div className="flex justify-center gap-2">
            <Button
              disabled={index <= 0}
              onClick={() => show(index - 1)}
              size="sm"
              type="button"
              variant="outline"
            >
              Previous
            </Button>
            <Button
              disabled={index < 0 || index >= ordered.length - 1}
              onClick={() => show(index + 1)}
              size="sm"
              type="button"
              variant="outline"
            >
              Next
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
