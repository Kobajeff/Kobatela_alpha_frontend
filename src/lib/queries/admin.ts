// React Query hooks encapsulating admin-specific API calls.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, extractErrorMessage } from '../apiClient';
import type {
  AdminDashboardStats,
  AdminProofReviewItem,
  SenderEscrowSummary
} from '@/types/api';

export function useAdminDashboard() {
  return useQuery<AdminDashboardStats>({
    queryKey: ['adminDashboard'],
    queryFn: async () => {
      const response = await apiClient.get<AdminDashboardStats>('/admin/dashboard');
      return response.data;
    }
  });
}

export function useAdminProofReviewQueue() {
  return useQuery<AdminProofReviewItem[]>({
    queryKey: ['adminProofReviewQueue'],
    queryFn: async () => {
      const response = await apiClient.get<AdminProofReviewItem[]>(
        '/admin/proofs/review-queue'
      );
      return response.data;
    }
  });
}

export function useAdminEscrowSummary(escrowId: string) {
  return useQuery<SenderEscrowSummary>({
    queryKey: ['adminEscrowSummary', escrowId],
    queryFn: async () => {
      const response = await apiClient.get<SenderEscrowSummary>(
        `/admin/escrows/${escrowId}/summary`
      );
      return response.data;
    },
    enabled: !!escrowId
  });
}

export function useAdminApproveProof() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (proofId) => {
      await apiClient.post(`/admin/proofs/${proofId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminProofReviewQueue'] });
    },
    onError: (error) => {
      throw new Error(extractErrorMessage(error));
    }
  });
}

export function useAdminRejectProof() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (proofId) => {
      await apiClient.post(`/admin/proofs/${proofId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminProofReviewQueue'] });
    },
    onError: (error) => {
      throw new Error(extractErrorMessage(error));
    }
  });
}
