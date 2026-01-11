"use client";

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import type { ProviderInboxResponse } from '@/types/api';
import type { ProviderInboxResponseUI } from '@/types/ui';
import { normalizeProviderInboxResponse } from '@/lib/normalize';

export function useProviderInboxEscrows(params: { limit?: number; offset?: number } = {}) {
  const { limit = 20, offset = 0 } = params;
  return useQuery<ProviderInboxResponseUI, Error>({
    queryKey: queryKeys.provider.inbox({ limit, offset }),
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        limit: String(limit),
        offset: String(offset)
      });
      const response = await apiClient.get<ProviderInboxResponse>(
        `/provider/inbox/escrows?${searchParams.toString()}`
      );
      return normalizeProviderInboxResponse(response.data);
    }
  });
}
