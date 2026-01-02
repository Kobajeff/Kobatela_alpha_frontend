import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient, extractErrorMessage, isNotFoundError } from '../apiClient';
import { normalizeApiError } from '../apiError';
import { queryKeys } from '../queryKeys';
import { buildQueryString, normalizePaginatedItems } from './queryUtils';
import type { AdvisorProfile, AdvisorProofItem } from '@/types/api';

const terminalProofStatuses = new Set(['APPROVED', 'REJECTED', 'CANCELLED']);

export function useAdvisorAssignedProofs(params: { status?: string } = {}) {
  const { status } = params;
  const filters = useMemo(() => ({ status }), [status]);

  return useQuery<AdvisorProofItem[]>({
    queryKey: queryKeys.advisor.assignedProofs(filters),
    queryFn: async () => {
      const query = buildQueryString(filters);
      const suffix = query ? `?${query}` : '';
      try {
        // Contract: GET /advisor/me/proofs (API_GUIDE.md — Advisor review)
        const response = await apiClient.get(`/advisor/me/proofs${suffix}`);
        return normalizePaginatedItems<AdvisorProofItem>(response.data);
      } catch (error) {
        throw new Error(extractErrorMessage(error));
      }
    },
    retry: (failureCount, error) => {
      const status = normalizeApiError(error).status;
      if (status === 401 || status === 403) return false;
      return failureCount < 1;
    },
    refetchOnWindowFocus: false,
    refetchInterval: (query) => {
      const proofs = query.state.data ?? [];
      const hasNonTerminal = proofs.some(
        (item) => !terminalProofStatuses.has(item.status?.toUpperCase?.() ?? item.status)
      );
      return hasNonTerminal ? 15000 : false;
    }
  });
}

export function useAdvisorProfile() {
  return useQuery<AdvisorProfile | null>({
    queryKey: queryKeys.advisor.profile(),
    queryFn: async () => {
      try {
        // Contract: GET /advisor/me/profile (API_GUIDE.md — Advisor review)
        const response = await apiClient.get<AdvisorProfile>('/advisor/me/profile');
        return response.data;
      } catch (error) {
        if (isNotFoundError(error)) {
          return null;
        }
        throw new Error(extractErrorMessage(error));
      }
    },
    retry: (failureCount, error) => {
      const status = normalizeApiError(error).status;
      if (status === 401 || status === 403) return false;
      const message = extractErrorMessage(error);
      if (message && failureCount > 1) return false;
      return true;
    },
    refetchOnWindowFocus: false
  });
}
