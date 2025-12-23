import type { QueryClient } from '@tanstack/react-query';

let queryClientRef: QueryClient | null = null;

export function setQueryClient(queryClient: QueryClient) {
  queryClientRef = queryClient;
}

export function getQueryClient() {
  return queryClientRef;
}
