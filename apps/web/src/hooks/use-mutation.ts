import { useCallback } from 'react';

import { apiUrl } from '@/lib/api.ts';
import { throwForFailedReport } from '@/lib/reports.ts';

type MutationMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type MutationParams<T> = {
  endpoint: string;
  method: MutationMethod;
  body?: unknown;
  keepalive?: boolean;
  parse: (value: unknown) => T;
  fallback: string;
};

export const useMutation = <T>() => {
  const mutate = useCallback(async (params: MutationParams<T>): Promise<T> => {
    const response = await fetch(`${apiUrl}${params.endpoint}`, {
      method: params.method,
      headers: { 'content-type': 'application/json' },
      body: params.body === undefined ? undefined : JSON.stringify(params.body),
      keepalive: params.keepalive
    });
    if (!response.ok) {
      await throwForFailedReport(response, params.fallback);
    }

    return params.parse(await response.json());
  }, []);

  return { mutate };
};
