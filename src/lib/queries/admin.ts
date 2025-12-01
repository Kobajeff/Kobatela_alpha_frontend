// React Query hooks encapsulating admin-specific API calls.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, extractErrorMessage } from '../apiClient';
import { isDemoMode } from '@/lib/config';
import { demoAdminProofQueue, demoAdminStats, getDemoEscrowSummary } from '@/lib/demoData';
import type {
  AdminDashboardStats,
  AdminAdvisorListItem,
  AdminAdvisorSummary,
  AdminProofReviewItem,
  AiProofSetting,
  SenderEscrowSummary
} from '@/types/api';

export function useAdminDashboard() {
  return useQuery<AdminDashboardStats>({
    queryKey: ['adminDashboard'],
    queryFn: async () => {
      if (isDemoMode()) {
        return new Promise<AdminDashboardStats>((resolve) => {
          setTimeout(() => resolve(demoAdminStats), 200);
        });
      }
      const response = await apiClient.get<AdminDashboardStats>('/admin/dashboard');
      return response.data;
    }
  });
}

export function useAdminProofReviewQueue() {
  return useQuery<AdminProofReviewItem[]>({
    queryKey: ['adminProofReviewQueue'],
    queryFn: async () => {
      if (isDemoMode()) {
        return new Promise<AdminProofReviewItem[]>((resolve) => {
          setTimeout(() => resolve(demoAdminProofQueue), 200);
        });
      }
      const response = await apiClient.get<AdminProofReviewItem[]>(
        '/admin/proofs/review-queue'
      );
      return response.data;
    }
  });
}

export function useAdminAdvisorsOverview() {
  return useQuery<AdminAdvisorSummary[]>({
    queryKey: ['admin', 'advisors', 'overview'],
    queryFn: async () => {
      const response = await apiClient.get<AdminAdvisorSummary[]>(
        '/admin/advisors/overview'
      );
      return response.data;
    }
  });
}

export function useAdminAdvisorsList() {
  return useQuery<AdminAdvisorListItem[]>({
    queryKey: ['admin', 'advisors', 'list'],
    queryFn: async () => {
      const response = await apiClient.get<AdminAdvisorListItem[]>(
        '/admin/advisors'
      );
      return response.data;
    }
  });
}

export function useAiProofSetting() {
  return useQuery<AiProofSetting>({
    queryKey: ['admin', 'settings', 'ai-proof'],
    queryFn: async () => {
      const response = await apiClient.get<AiProofSetting>(
        '/admin/settings/ai-proof'
      );
      return response.data;
    }
  });
}

export function useUpdateAiProofSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await apiClient.post<AiProofSetting>(
        '/admin/settings/ai-proof',
        { bool_value: enabled }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'ai-proof'] });
    }
  });
}

export function useAdminEscrowSummary(escrowId: string) {
  return useQuery<SenderEscrowSummary>({
    queryKey: ['adminEscrowSummary', escrowId],
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
      if (isDemoMode()) {
        return new Promise<void>((resolve) => {
          setTimeout(() => resolve(), 200);
        });
      }
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
      if (isDemoMode()) {
        return new Promise<void>((resolve) => {
          setTimeout(() => resolve(), 200);
        });
      }
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
