// React Query hooks encapsulating sender-specific API calls.
import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { apiClient, extractErrorMessage, isUnauthorizedError } from '../apiClient';
import { clearAuthToken, setAuthToken } from '../auth';
import { getDemoRole, isDemoMode } from '@/lib/config';
import {
  demoEscrows,
  demoAdvisorProfile,
  demoPayments,
  demoProofs,
  getDemoEscrowSummary,
  getDemoUserByRole
} from '@/lib/demoData';
import type {
  CreateProofPayload,
  EscrowListItem,
  AuthLoginResponse,
  AuthUser,
  Payment,
  Proof,
  AdvisorProfile,
  SenderDashboard,
  SenderEscrowSummary,
  AuthMeResponse
} from '@/types/api';

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation<AuthLoginResponse, Error, { email: string }>({
    mutationFn: async ({ email }) => {
      const response = await apiClient.post<AuthLoginResponse>('/auth/login', { email });
      return response.data;
    },
    onSuccess: (data) => {
      const token = data.token ?? data.access_token;
      if (token) {
        setAuthToken(token);
      }
      queryClient.invalidateQueries({ queryKey: ['authMe'] });
    },
    onError: (error) => {
      throw new Error(extractErrorMessage(error));
    }
  });
}

export function useMyAdvisor() {
  return useQuery<AdvisorProfile | null>({
    queryKey: ['myAdvisor'],
    queryFn: async () => {
      if (isDemoMode()) {
        return new Promise((resolve) => {
          setTimeout(() => resolve(demoAdvisorProfile), 200);
        });
      }
      try {
        const response = await apiClient.get<AdvisorProfile>('/me/advisor');
        return response.data ?? null;
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 404) {
          return null;
        }
        throw error;
      }
    }
  });
}

export function useAuthMe() {
  const queryClient = useQueryClient();
  const query = useQuery<AuthUser, Error>({
    queryKey: ['authMe'],
    queryFn: async () => {
      if (isDemoMode()) {
        const role = getDemoRole();
        const user = getDemoUserByRole(role);
        return new Promise((resolve) => {
          setTimeout(() => resolve(user), 200);
        });
      }
      const response = await apiClient.get<AuthMeResponse>('/auth/me');
      return response.data.user;
    },
    retry: (failureCount, error) => {
      const message = extractErrorMessage(error);
      if (message && failureCount > 1) return false;
      return true;
    }
  });

  useEffect(() => {
    if (query.error && isUnauthorizedError(query.error)) {
      clearAuthToken();
      queryClient.removeQueries({ queryKey: ['authMe'] });
    }
  }, [query.error, queryClient]);

  return query;
}

export function useMyProfile() {
  return useAuthMe();
}

export function useSenderDashboard() {
  return useQuery<SenderDashboard>({
    queryKey: ['senderDashboard'],
    queryFn: async () => {
      if (isDemoMode()) {
        const recentEscrows = demoEscrows.slice(0, 3);
        const pendingProofs = demoProofs.filter((p) => p.status === 'pending');
        const recentPayments = demoPayments;

        return new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                recent_escrows: recentEscrows,
                pending_proofs: pendingProofs,
                recent_payments: recentPayments
              }),
            200
          );
        });
      }
      const response = await apiClient.get<SenderDashboard>('/sender/dashboard');
      return response.data;
    }
  });
}

export function useSenderEscrows(params: { status?: string; limit?: number; offset?: number } = {}) {
  const { status, limit = 20, offset = 0 } = params;
  return useQuery<EscrowListItem[]>({
    queryKey: ['senderEscrows', { status, limit, offset }],
    queryFn: async () => {
      if (isDemoMode()) {
        let items = demoEscrows;
        if (status && status !== 'all') {
          items = items.filter((e) => e.status === status);
        }
        const slice = items.slice(offset, offset + limit);

        return new Promise((resolve) => {
          setTimeout(() => resolve(slice), 200);
        });
      }
      const searchParams = new URLSearchParams({ mine: 'true', limit: String(limit), offset: String(offset) });
      if (status) searchParams.append('status', status);
      const response = await apiClient.get<EscrowListItem[]>(`/escrows?${searchParams.toString()}`);
      return response.data;
    }
  });
}

export function useSenderEscrowSummary(escrowId: string) {
  return useQuery<SenderEscrowSummary>({
    queryKey: ['escrowSummary', escrowId],
    queryFn: async () => {
      if (isDemoMode()) {
        const summary = getDemoEscrowSummary(escrowId);
        if (!summary) {
          throw new Error('Escrow not found in demo data');
        }
        return new Promise((resolve) => {
          setTimeout(() => resolve(summary), 200);
        });
      }
      const response = await apiClient.get<SenderEscrowSummary>(`/escrows/${escrowId}/summary`);
      return response.data;
    },
    enabled: Boolean(escrowId)
  });
}

function useEscrowAction(
  escrowId: string,
  path: string
) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      if (isDemoMode()) {
        return new Promise<void>((resolve) => {
          setTimeout(() => resolve(), 200);
        });
      }
      await apiClient.post(`/escrows/${escrowId}/${path}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escrowSummary', escrowId] });
    },
    onError: (error) => {
      throw new Error(extractErrorMessage(error));
    }
  });
}

export function useMarkDelivered(escrowId: string) {
  return useEscrowAction(escrowId, 'mark-delivered');
}

export function useClientApprove(escrowId: string) {
  return useEscrowAction(escrowId, 'client-approve');
}

export function useClientReject(escrowId: string) {
  return useEscrowAction(escrowId, 'client-reject');
}

export function useCheckDeadline(escrowId: string) {
  return useEscrowAction(escrowId, 'check-deadline');
}

export function useCreateProof() {
  const queryClient = useQueryClient();
  return useMutation<Proof, Error, CreateProofPayload>({
    mutationFn: async (payload) => {
      if (isDemoMode()) {
        const now = new Date().toISOString();
        const attachment = payload.attachment_url ?? 'https://example.com/demo-proof';
        return {
          id: `demo-proof-${Date.now()}`,
          escrow_id: payload.escrow_id,
          milestone_id: payload.milestone_id,
          description: payload.description,
          attachment_url: attachment,
          file_id: payload.file_id ?? 'demo-file-id',
          status: 'pending',
          created_at: now,
          ai_risk_level: null,
          ai_score: null,
          ai_explanation: null,
          ai_checked_at: null
        };
      }
      const response = await apiClient.post<Proof>('/proofs', payload);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['escrowSummary', data.escrow_id] });
      queryClient.invalidateQueries({ queryKey: ['senderDashboard'] });
    },
    onError: (error) => {
      throw new Error(extractErrorMessage(error));
    }
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      clearAuthToken();
    },
    onSuccess: () => {
      queryClient.clear();
    }
  });
}
