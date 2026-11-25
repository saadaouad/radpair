import { useQuery, type QueryKey, type UseQueryResult } from '@tanstack/react-query';

import { apiUrl } from '@/lib/api.ts';

type UseFetchOptions<T> = {
  enabled?: boolean;
  fallback: string;
  notFound?: string;
  structuralSharing?: boolean | ((oldData: T | undefined, newData: T) => T);
};

const readJson = async <T>(
  endpoint: string,
  parse: (value: unknown) => T,
  options: { fallback: string; notFound?: string; signal?: AbortSignal }
): Promise<T> => {
  const response = await fetch(`${apiUrl}${endpoint}`, { signal: options.signal });
  if (response.status === 404 && options.notFound) {
    throw new Error(options.notFound);
  }
  if (!response.ok) {
    throw new Error(response.status === 503 ? 'The database is unavailable.' : options.fallback);
  }

  return parse(await response.json());
};

export const useFetch = <T>(
  queryKey: QueryKey,
  endpoint: string,
  parse: (value: unknown) => T,
  options: UseFetchOptions<T>
): UseQueryResult<T> => {
  return useQuery({
    queryKey,
    queryFn: ({ signal }) =>
      readJson(endpoint, parse, {
        fallback: options.fallback,
        notFound: options.notFound,
        signal
      }),
    enabled: options.enabled,
    structuralSharing: options.structuralSharing as
      | boolean
      | ((oldData: unknown, newData: unknown) => unknown)
      | undefined
  });
};
