import { healthResponseSchema } from '@repo/contracts';
import { useQuery } from '@tanstack/react-query';

import { apiUrl } from '@/lib/api.ts';

export const StatusPage = () => {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const response = await fetch(`${apiUrl}/health`);
      if (!response.ok) {
        throw new Error('The API did not respond.');
      }

      return healthResponseSchema.parse(await response.json());
    }
  });

  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">API status</h1>
      {health.isPending ? <p className="text-sm text-muted-foreground">Checking the API.</p> : null}
      {health.isError ? (
        <p className="text-sm">The API is unavailable. Your place in the app is unchanged.</p>
      ) : null}
      {health.data ? (
        <p className="text-sm text-muted-foreground">
          The API is responding and the database is up.
        </p>
      ) : null}
    </section>
  );
};
