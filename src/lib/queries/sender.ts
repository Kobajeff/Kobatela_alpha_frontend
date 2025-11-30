// React Query hooks encapsulating sender-specific API calls.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, extractErrorMessage } from '../apiClient';
import { clearAuthToken, setAuthToken } from '../auth';
import type {
  CreateProofPayload,
  EscrowListItem,
  LoginResponse,
  Payment,
  Proof,
  SenderDashboard,
  SenderEscrowSummary,
  UserMe
} from '@/types/api';

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation<{ token: string }, Error, { email: string }>({
    mutationFn: async ({ email }) => {
      const response = await apiClient.post<LoginResponse>('/auth/login', { email });
      return response.data;
    },
    onSuccess: (data) => {
      setAuthToken(data.token);
      queryClient.invalidateQueries({ queryKey: ['authMe'] });
    },
    onError: (error) => {
      throw new Error(extractErrorMessage(error));
    }
  });
}

export function useAuthMe() {
  return useQuery<UserMe>({
    queryKey: ['authMe'],
    queryFn: async () => {
      const response = await apiClient.get<UserMe>('/auth/me');
      return response.data;
    },
    retry: (failureCount, error) => {
      const message = extractErrorMessage(error);
      if (message && failureCount > 1) return false;
      return true;
    }
  });
}

export function useSenderDashboard() {
  return useQuery<SenderDashboard>({
    queryKey: ['senderDashboard'],
    queryFn: async () => {
      const response = await apiClient.get<SenderDashboard>('/sender/dashboard');
      return response.data;
    }
  });
}

export function useSenderEscrows(params: { status?: string; limit?: number; offset?: number } = {}) {
  const { status, limit = 20, offset = 0 } = params;
  return useQuery<EscrowListItem[]>({
    queryKey: ['senderEscrows', status, limit, offset],
    queryFn: async () => {
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
      const response = await apiClient.post<Proof>('/proofs', payload);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['escrowSummary', data.escrow_id] });
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
