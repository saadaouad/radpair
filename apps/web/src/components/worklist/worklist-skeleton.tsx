import { Skeleton } from '@/components/ui/skeleton.tsx';

export const WorklistSkeleton = () => {
  return (
    <div className="space-y-3" aria-hidden="true">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="hidden h-64 w-full lg:block" />
      <div className="grid gap-3 lg:hidden">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
};
