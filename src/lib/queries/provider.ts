"use client";

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { isDemoMode } from '@/lib/config';
import { queryKeys } from '@/lib/queryKeys';
import type { ProviderInboxResponse } from '@/types/api';

export function useProviderInboxEscrows(params: { limit?: number; offset?: number } = {}) {
  const { limit = 20, offset = 0 } = params;
  return useQuery<ProviderInboxResponse, Error>({
    queryKey: queryKeys.provider.inbox({ limit, offset }),
    queryFn: async () => {
      if (isDemoMode()) {
        return new Promise<ProviderInboxResponse>((resolve) => {
          setTimeout(
            () =>
              resolve({
                items: [],
                total: 0,
                limit,
                offset
              }),
            200
          );
        });
      }
      const searchParams = new URLSearchParams({
        limit: String(limit),
        offset: String(offset)
      });
      const response = await apiClient.get<ProviderInboxResponse>(
        `/provider/inbox/escrows?${searchParams.toString()}`
      );
      return response.data;
    }
  });
}
