import { useQuery, type QueryKey, type UseQueryResult } from '@tanstack/react-query';

import { apiUrl } from '@/lib/api.ts';

type UseFetchOptions<T> = {
  enabled?: boolean;
  fallback: string;
  notFound?: string;
  structuralSharing?: boolean | ((oldData: T | undefined, newData: T) => T);
};

const unreachableMessage =
  'The API is unreachable. Check your connection or try again in a moment.';

const readJson = async <T>(
  endpoint: string,
  parse: (value: unknown) => T,
  options: { fallback: string; notFound?: string; signal?: AbortSignal }
): Promise<T> => {
  let response: Response;
  try {
    response = await fetch(`${apiUrl}${endpoint}`, { signal: options.signal });
  } catch {
    throw new Error(unreachableMessage);
  }

  if (response.status === 404 && options.notFound) {
    throw new Error(options.notFound);
  }
  if (!response.ok) {
    if (response.status === 503) {
      throw new Error('The database is unavailable.');
    }
    if (response.status >= 502) {
      throw new Error('The API is temporarily unavailable.');
    }
    throw new Error(options.fallback);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error('The API returned an unexpected response.');
  }

  return parse(body);
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
