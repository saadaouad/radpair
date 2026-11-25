import { healthResponseSchema } from '@repo/contracts';

import { Button } from '@/components/ui/button.tsx';
import { useFetch } from '@/hooks/use-fetch.ts';
import { apiUrl } from '@/lib/api.ts';

export const StatusPage = () => {
  const health = useFetch(['health'], async () => {
    const response = await fetch(`${apiUrl}/health`);
    if (!response.ok) {
      throw new Error('The API did not respond.');
    }

    return healthResponseSchema.parse(await response.json());
  });

  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">API status</h1>
      {health.isPending ? <p className="text-sm text-muted-foreground">Checking the API.</p> : null}
      {health.isError ? (
        <div className="space-y-3">
          <p className="text-sm">The API is unavailable. Your place in the app is unchanged.</p>
          <Button onClick={() => health.refetch()} type="button" variant="outline">
            Try again
          </Button>
        </div>
      ) : null}
      {health.data ? (
        <p className="text-sm text-muted-foreground">
          The API is responding and the database is up.
        </p>
      ) : null}
    </section>
  );
};
