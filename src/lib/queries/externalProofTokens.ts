import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  type ExternalProofToken,
  type ExternalProofTokenIssuePayload,
  type ExternalProofTokenListResponse
} from '@/types/api';
import { apiClient, extractErrorMessage } from '../apiClient';
import { queryKeys } from '../queryKeys';

function normalizeListResponse(response: ExternalProofTokenListResponse): ExternalProofToken[] {
  if (Array.isArray(response)) return response;
  return response.items;
}

export function useIssueExternalProofToken() {
  const queryClient = useQueryClient();
  return useMutation<ExternalProofToken, unknown, ExternalProofTokenIssuePayload>({
    mutationFn: async (payload) => {
      // Contract: docs/Backend_info/API_GUIDE (11).md — External proofs — POST /sender/external-proof-tokens — sender/support/admin scopes
      const response = await apiClient.post<ExternalProofToken>('/sender/external-proof-tokens', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['externalProofTokens'] });
    },
    onError: (error) => {
      throw new Error(extractErrorMessage(error));
    }
  });
}

export function useExternalProofTokensList(filters: {
  escrow_id?: string | number;
  milestone_idx?: number | string;
  limit?: number;
  offset?: number;
}) {
  const normalizedFilters = {
    escrow_id: filters.escrow_id,
    milestone_idx: filters.milestone_idx,
    limit: filters.limit,
    offset: filters.offset
  };

  return useQuery({
    queryKey: queryKeys.externalProofTokens.list(normalizedFilters),
    queryFn: async () => {
      // Contract: docs/Backend_info/API_GUIDE (11).md — External proofs — GET /sender/external-proof-tokens — sender/support/admin scopes
      const response = await apiClient.get<ExternalProofTokenListResponse>(
        '/sender/external-proof-tokens',
        { params: normalizedFilters }
      );
      return normalizeListResponse(response.data);
    },
    enabled: Boolean(filters.escrow_id)
  });
}

export function useExternalProofTokenDetail(tokenId?: string | number | null) {
  return useQuery({
    queryKey: queryKeys.externalProofTokens.detail(tokenId),
    queryFn: async () => {
      // Contract: docs/Backend_info/API_GUIDE (11).md — External proofs — GET /sender/external-proof-tokens/{token_id} — sender/support/admin scopes
      const response = await apiClient.get<ExternalProofToken>(`/sender/external-proof-tokens/${tokenId}`);
      return response.data;
    },
    enabled: Boolean(tokenId)
  });
}

export function useRevokeExternalProofToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tokenId: string | number) => {
      // Contract: docs/Backend_info/API_GUIDE (11).md — External proofs — POST /sender/external-proof-tokens/{token_id}/revoke — sender/support/admin scopes
      const response = await apiClient.post<ExternalProofToken>(
        `/sender/external-proof-tokens/${tokenId}/revoke`
      );
      return response.data;
    },
    onSuccess: (_, tokenId) => {
      queryClient.invalidateQueries({ queryKey: ['externalProofTokens'] });
      if (tokenId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.externalProofTokens.detail(tokenId) });
      }
    },
    onError: (error) => {
      throw new Error(extractErrorMessage(error));
    }
  });
}
