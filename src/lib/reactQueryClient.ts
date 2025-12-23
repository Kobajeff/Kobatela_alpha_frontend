import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import type { Mutation, MutationOptions, MutationState } from '@tanstack/query-core';
import axios from 'axios';
import { recordNetworkError } from './networkHealth';

const MAX_RETRIES = 3;
const MAX_RETRY_DELAY_MS = 4000;

type RetryMeta = {
  idempotent?: boolean;
};

export function getStatus(error: unknown): number | undefined {
  if (axios.isAxiosError(error)) {
    return error.response?.status;
  }

  if (error && typeof error === 'object') {
    const maybeError = error as { response?: { status?: number }; status?: number };
    return maybeError.status ?? maybeError.response?.status;
  }

  return undefined;
}

const isNetworkError = (status: number | undefined) => status === undefined;

export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_RETRIES) return false;
  const status = getStatus(error);
  return status === 500 || status === 429 || isNetworkError(status);
}

export function shouldRetryMutation(
  failureCount: number,
  error: unknown,
  meta?: RetryMeta
): boolean {
  if (!meta?.idempotent) return false;
  const status = getStatus(error);
  if (status === 409 || status === 422) return false;
  if (failureCount >= MAX_RETRIES) return false;
  return status === 500 || status === 429 || isNetworkError(status);
}

export function retryDelay(attemptIndex: number): number {
  return Math.min(1000 * 2 ** attemptIndex, MAX_RETRY_DELAY_MS);
}

const handleCacheError = (error: unknown) => {
  const status = getStatus(error);
  if (status && status >= 500) {
    recordNetworkError('server');
    return;
  }

  if (isNetworkError(status)) {
    recordNetworkError('network');
  }
};

class IdempotentMutationCache extends MutationCache {
  build<TData, TError, TVariables, TContext>(
    client: QueryClient,
    options: MutationOptions<TData, TError, TVariables, TContext>,
    state?: MutationState<TData, TError, TVariables, TContext>
  ): Mutation<TData, TError, TVariables, TContext> {
    const meta = options?.meta as RetryMeta | undefined;
    const retry =
      meta?.idempotent === true
        ? (failureCount: number, error: unknown) =>
            shouldRetryMutation(failureCount, error, meta)
        : false;
    const retryDelayOption =
      meta?.idempotent === true
        ? (attemptIndex: number, error: unknown) => retryDelay(attemptIndex)
        : options?.retryDelay;

    return super.build(
      client,
      {
        ...options,
        retry,
        retryDelay: retryDelayOption
      },
      state
    );
  }
}

export function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: handleCacheError
    }),
    mutationCache: new IdempotentMutationCache({
      onError: handleCacheError
    }),
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => shouldRetryQuery(failureCount, error),
        retryDelay: (attemptIndex, error) => retryDelay(attemptIndex),
        staleTime: 0,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true
      },
      mutations: {
        retry: false,
        retryDelay: (attemptIndex, error) => retryDelay(attemptIndex)
      }
    }
  });
}
