import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  type ExternalProofToken,
  type ExternalProofTokenIssuePayload,
  type ExternalProofTokenListResponse
} from '@/types/api';
import type {
  ExternalProofTokenListResponseUI,
  ExternalProofTokenUI
} from '@/types/ui';
import { apiClient, extractErrorMessage } from '../apiClient';
import { queryKeys } from '../queryKeys';
import { normalizeExternalProofToken, normalizeExternalProofTokenList } from '@/lib/normalize';
import type { UIId } from '@/types/id';

function normalizeListResponse(
  response: ExternalProofTokenListResponse
): ExternalProofTokenListResponseUI {
  return normalizeExternalProofTokenList(response);
}

export function useIssueExternalProofToken() {
  const queryClient = useQueryClient();
  return useMutation<ExternalProofTokenUI, unknown, ExternalProofTokenIssuePayload>({
    mutationFn: async (payload) => {
      // Contract: docs/Backend_info/API_GUIDE (11).md — External proofs — POST /sender/external-proof-tokens — sender/support/admin scopes
      const response = await apiClient.post<ExternalProofToken>('/sender/external-proof-tokens', payload);
      return normalizeExternalProofToken(response.data);
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
  escrow_id?: UIId;
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

  return useQuery<ExternalProofTokenUI[]>({
    queryKey: queryKeys.externalProofTokens.list(normalizedFilters),
    queryFn: async () => {
      // Contract: docs/Backend_info/API_GUIDE (11).md — External proofs — GET /sender/external-proof-tokens — sender/support/admin scopes
      const response = await apiClient.get<ExternalProofTokenListResponse>(
        '/sender/external-proof-tokens',
        { params: normalizedFilters }
      );
      const normalized = normalizeListResponse(response.data);
      return normalized.items;
    },
    enabled: Boolean(filters.escrow_id)
  });
}

export function useExternalProofTokenDetail(tokenId?: UIId | null) {
  return useQuery<ExternalProofTokenUI>({
    queryKey: queryKeys.externalProofTokens.detail(tokenId),
    queryFn: async () => {
      // Contract: docs/Backend_info/API_GUIDE (11).md — External proofs — GET /sender/external-proof-tokens/{token_id} — sender/support/admin scopes
      const response = await apiClient.get<ExternalProofToken>(`/sender/external-proof-tokens/${tokenId}`);
      return normalizeExternalProofToken(response.data);
    },
    enabled: Boolean(tokenId)
  });
}

export function useRevokeExternalProofToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tokenId: UIId) => {
      // Contract: docs/Backend_info/API_GUIDE (11).md — External proofs — POST /sender/external-proof-tokens/{token_id}/revoke — sender/support/admin scopes
      const response = await apiClient.post<ExternalProofToken>(
        `/sender/external-proof-tokens/${tokenId}/revoke`
      );
      return normalizeExternalProofToken(response.data);
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
