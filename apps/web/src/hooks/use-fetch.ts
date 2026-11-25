import { useQuery, type QueryKey, type UseQueryResult } from '@tanstack/react-query';

type UseFetchOptions = {
  enabled?: boolean;
};

export const useFetch = <T>(
  queryKey: QueryKey,
  queryFn: () => Promise<T>,
  options?: UseFetchOptions
): UseQueryResult<T> => {
  return useQuery({
    queryKey,
    queryFn,
    enabled: options?.enabled
  });
};
