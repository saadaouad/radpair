import { useQuery, type QueryKey, type UseQueryResult } from '@tanstack/react-query';

type UseFetchOptions<T> = {
  enabled?: boolean;
  structuralSharing?: boolean | ((oldData: T | undefined, newData: T) => T);
};

export const useFetch = <T>(
  queryKey: QueryKey,
  queryFn: (signal: AbortSignal) => Promise<T>,
  options?: UseFetchOptions<T>
): UseQueryResult<T> => {
  return useQuery({
    queryKey,
    queryFn: ({ signal }) => queryFn(signal),
    enabled: options?.enabled,
    structuralSharing: options?.structuralSharing as
      | boolean
      | ((oldData: unknown, newData: unknown) => unknown)
      | undefined
  });
};
