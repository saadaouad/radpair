import { Button } from '@/components/ui/button.tsx';

export const fetchErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export const ApiErrorNotice = ({
  message,
  onRetry,
  retryLabel = 'Try again'
}: {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}) => {
  return (
    <div
      className="rounded-xl border border-dashed border-destructive/30 bg-destructive/5 px-4 py-4"
      role="alert"
    >
      <p className="text-sm">{message}</p>
      {onRetry ? (
        <Button className="mt-3" onClick={onRetry} size="sm" type="button" variant="outline">
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
};
