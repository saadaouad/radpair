import { Dialog } from 'radix-ui';

import { LateralityAlertBody } from '@/components/report/laterality-alert.tsx';
import { Button } from '@/components/ui/button.tsx';

export const SignDialog = ({
  open,
  pending,
  message,
  lateralityWarning,
  onCancel,
  onConfirm
}: {
  open: boolean;
  pending: boolean;
  message: string;
  lateralityWarning?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) => {
  return (
    <Dialog.Root
      onOpenChange={(next) => {
        if (!next && !pending) {
          onCancel();
        }
      }}
      open={open}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[min(100%-2rem,28rem)] -translate-x-1/2 -translate-y-1/2 space-y-3 rounded-xl bg-background p-4 shadow-lg">
          <Dialog.Title className="text-lg font-semibold">Sign this report</Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground">
            Signing locks the report. The text and key images cannot be changed afterward.
          </Dialog.Description>
          {lateralityWarning ? <LateralityAlertBody message={lateralityWarning} /> : null}
          {message ? <p className="text-sm text-destructive">{message}</p> : null}
          <div className="flex justify-end gap-2">
            <Button disabled={pending} onClick={onCancel} type="button" variant="outline">
              Cancel
            </Button>
            <Button disabled={pending} onClick={onConfirm} type="button">
              {pending ? 'Signing' : 'Sign report'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
