import type { StudyImageResponse } from '@repo/contracts';
import { Dialog } from 'radix-ui';

import { Button } from '@/components/ui/button.tsx';

export const ImageDialog = ({
  image,
  onClose
}: {
  image: StudyImageResponse | null;
  onClose: () => void;
}) => {
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
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100%-2rem)] w-[min(100%-2rem,56rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-xl bg-background p-4 shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <Dialog.Title className="text-sm font-medium">
              {image ? `Image ${image.position}` : 'Image'}
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button size="sm" type="button" variant="outline">
                Close
              </Button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">
            Larger view of the study image.
          </Dialog.Description>
          {image ? (
            <img
              alt={`Series ${image.position}`}
              className="max-h-[70vh] w-full rounded-lg bg-muted object-contain"
              src={image.url}
            />
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
