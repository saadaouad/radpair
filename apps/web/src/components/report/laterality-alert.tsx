const lateralityAlertClassName =
  'rounded-lg border border-amber-400/90 bg-amber-500/25 px-3 py-2 text-sm font-medium text-amber-50';

export const LateralityAlert = ({ message }: { message: string }) => {
  return (
    <p className={lateralityAlertClassName} role="status">
      {message}
    </p>
  );
};
