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
  AdvisorProfile,
  AdvisorSenderItem,
  AdminEscrowSummary,
  ApiKey,
  SenderAccountRow,
  AuthUser
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

export function useAdminSendersList(params: { limit?: number; offset?: number; search?: string } = {}) {
  const { limit = 50, offset = 0, search } = params;
  return useQuery<SenderAccountRow[]>({
    queryKey: ['admin', 'senders', { limit, offset, search }],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        scope: 'sender',
        active: 'true',
        limit: String(limit),
        offset: String(offset)
      });
      const response = await apiClient.get<ApiKey[]>(`/apikeys?${searchParams.toString()}`);
      const rows = response.data
        .map((key) => {
          const user = key.user as Partial<AuthUser> | undefined;
          const userId = user?.id ?? key.user_id ?? key.id;
          const role = (user?.role ?? 'sender') as SenderAccountRow['role'];

          return {
            user_id: userId,
            email: user?.email ?? '',
            username: user?.username,
            role,
            api_key_id: key.id,
            api_key_name: key.name,
            is_active: key.is_active,
            created_at: key.created_at
          } satisfies SenderAccountRow;
        })
        .filter((row) => row.email && (row.role === 'sender' || row.role === 'both'));

      if (search) {
        const term = search.toLowerCase();
        return rows.filter(
          (row) =>
            row.email.toLowerCase().includes(term) ||
            (row.username && row.username.toLowerCase().includes(term))
        );
      }

      return rows;
    }
  });
}

export function useAdminSenderProfile(userId?: string | number) {
  return useQuery<AuthUser>({
    queryKey: ['admin', 'sender', userId],
    queryFn: async () => {
      const response = await apiClient.get<AuthUser>(`/users/${userId}`);
      return response.data;
    },
    enabled: !!userId
  });
}

export function useAdminBlockSender() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ api_key_id }: { api_key_id: string | number }) => {
      await apiClient.delete(`/apikeys/${api_key_id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'senders'] });
    },
    onError: (error) => {
      throw new Error(extractErrorMessage(error));
    }
  });
}

export function useAdminProofReviewQueue(params: {
  limit?: number;
  offset?: number;
  advisor_id?: string;
  unassigned_only?: boolean;
} = {}) {
  const { limit = 20, offset = 0, advisor_id, unassigned_only } = params;
  return useQuery<AdminProofReviewItem[]>({
    queryKey: ['adminProofReviewQueue', { limit, offset, advisor_id, unassigned_only }],
    queryFn: async () => {
      if (isDemoMode()) {
        return new Promise<AdminProofReviewItem[]>((resolve) => {
          setTimeout(() => resolve(demoAdminProofQueue), 200);
        });
      }
      const searchParams = new URLSearchParams({
        limit: String(limit),
        offset: String(offset)
      });
      if (advisor_id) searchParams.set('advisor_id', advisor_id);
      if (unassigned_only !== undefined) searchParams.set('unassigned_only', String(unassigned_only));
      const response = await apiClient.get<AdminProofReviewItem[]>(
        `/admin/proofs/review-queue?${searchParams.toString()}`
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

export function useAdminAdvisorsList(active?: boolean) {
  return useQuery<AdminAdvisorListItem[]>({
    queryKey: ['admin', 'advisors', 'list', { active }],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (active !== undefined) {
        searchParams.set('active', String(active));
      }
      const suffix = searchParams.toString();
      const response = await apiClient.get<AdminAdvisorListItem[]>(
        suffix ? `/admin/advisors?${suffix}` : '/admin/advisors'
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
  return useQuery<AdminEscrowSummary>({
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
      const response = await apiClient.get<AdminEscrowSummary>(
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
      queryClient.invalidateQueries({ queryKey: ['adminEscrowSummary'] });
    },
    onError: (error) => {
      throw new Error(extractErrorMessage(error));
    }
  });
}

export function useAdminAdvisorDetail(advisorId: number) {
  return useQuery<AdvisorProfile>({
    queryKey: ['admin', 'advisor', advisorId],
    queryFn: async () => {
      const response = await apiClient.get<AdvisorProfile>(`/admin/advisors/${advisorId}`);
      return response.data;
    },
    enabled: !!advisorId
  });
}

export function useAdminAdvisorSenders(advisorId: number) {
  return useQuery<AdvisorSenderItem[]>({
    queryKey: ['admin', 'advisor', advisorId, 'senders'],
    queryFn: async () => {
      const response = await apiClient.get<AdvisorSenderItem[]>(
        `/admin/advisors/${advisorId}/senders`
      );
      return response.data;
    },
    enabled: !!advisorId
  });
}

export function useAdminUpdateAdvisor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { advisorId: number; data: Partial<AdvisorProfile> }) => {
      const { advisorId, data } = params;
      const response = await apiClient.patch(`/admin/advisors/${advisorId}`, data);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'advisors'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'advisors', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'advisors', 'overview'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'advisor', variables.advisorId] });
    },
    onError: (error) => {
      throw new Error(extractErrorMessage(error));
    }
  });
}

export function useAdminAssignSender() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { advisorId: number; sender_email: string }) => {
      const { advisorId, sender_email } = params;
      const response = await apiClient.post(`/admin/advisors/${advisorId}/assign-sender`, {
        sender_email
      });
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'advisor', variables.advisorId, 'senders'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'advisors', 'overview'] });
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
      queryClient.invalidateQueries({ queryKey: ['adminEscrowSummary'] });
    },
    onError: (error) => {
      throw new Error(extractErrorMessage(error));
    }
  });
}
