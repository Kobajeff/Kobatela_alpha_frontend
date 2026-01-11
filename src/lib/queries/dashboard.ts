"use client";

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { buildQueryString } from '@/lib/queries/queryUtils';
import type { EscrowListItem, PaginatedResponse, ProviderInboxResponse } from '@/types/api';

type EscrowListResponse = EscrowListItem[] | PaginatedResponse<EscrowListItem>;

export type EscrowPreviewResponse = {
  items: EscrowListItem[];
  total?: number;
  limit?: number;
  offset?: number;
};

function parseEscrowListResponse(data: unknown): EscrowPreviewResponse {
  if (Array.isArray(data)) {
    return { items: data, total: data.length };
  }

  if (data && typeof data === 'object') {
    const response = data as PaginatedResponse<EscrowListItem>;
    if (Array.isArray(response.items)) {
      return {
        items: response.items,
        total: typeof response.total === 'number' ? response.total : response.items.length,
        limit: response.limit,
        offset: response.offset
      };
    }
  }

  throw new Error('Unexpected /escrows response shape. Expected list or paginated response.');
}

export function useDashboardSentEscrowsPreview(params: {
  senderId?: string | number;
  limit?: number;
  offset?: number;
  enabled?: boolean;
}) {
  const { senderId, limit = 5, offset = 0, enabled = true } = params;
  const queryParams = { mine: true, sender_id: senderId, limit, offset };

  return useQuery<EscrowPreviewResponse, Error>({
    queryKey: queryKeys.dashboard.sentEscrowsPreview(queryParams),
    queryFn: async () => {
      if (!senderId) {
        throw new Error('Missing sender id for escrows preview.');
      }
      const query = buildQueryString(queryParams);
      const response = await apiClient.get<EscrowListResponse>(`/escrows?${query}`);
      return parseEscrowListResponse(response.data);
    },
    enabled: enabled && Boolean(senderId)
  });
}

export function useDashboardProviderInboxPreview(params: {
  limit?: number;
  offset?: number;
  enabled?: boolean;
}) {
  const { limit = 5, offset = 0, enabled = true } = params;
  const queryParams = { limit, offset };

  return useQuery<ProviderInboxResponse, Error>({
    queryKey: queryKeys.dashboard.providerInboxPreview(queryParams),
    queryFn: async () => {
      const query = buildQueryString(queryParams);
      const response = await apiClient.get<ProviderInboxResponse>(`/provider/inbox/escrows?${query}`);
      return response.data;
    },
    enabled
  });
}
