// React Query hooks encapsulating admin-specific API calls.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, extractErrorMessage, logApiError } from '../apiClient';
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
  User,
  UserRole
} from '@/types/api';

function mapApiKeyToSenderRow(apiKey: ApiKey): SenderAccountRow | null {
  const user = apiKey.user;
  const userId = user?.id ?? apiKey.user_id;
  if (!userId || !user?.email) return null;

  return {
    user_id: String(userId),
    email: user.email,
    username: user.username,
    role: (user.role ?? 'sender') as UserRole,
    api_key_id: String(apiKey.id),
    api_key_name: apiKey.name,
    is_active: apiKey.is_active,
    created_at: apiKey.created_at
  };
}

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

export function useAdminSendersList(params?: {
  limit?: number;
  offset?: number;
  search?: string;
}) {
  const { limit = 100, offset = 0, search } = params ?? {};

  return useQuery<SenderAccountRow[]>({
    queryKey: ['admin-senders', { limit, offset }],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/apikeys', {
          params: { scope: 'sender', active: true, limit, offset }
        });

        const raw = res.data as any;

        const apiKeys: ApiKey[] = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.items)
          ? raw.items
          : [];

        const rows = apiKeys
          .map(mapApiKeyToSenderRow)
          .filter((x): x is SenderAccountRow => x !== null);

        if (search && search.trim()) {
          const s = search.trim().toLowerCase();
          return rows.filter(
            (row) =>
              row.email.toLowerCase().includes(s) ||
              (row.username && row.username.toLowerCase().includes(s))
          );
        }

        return rows;
      } catch (err) {
        logApiError(err, 'GET /apikeys (admin senders)');
        throw err;
      }
    }
  });
}

export function useAdminSenderProfile(userId?: string) {
  return useQuery<User>({
    queryKey: ['admin', 'sender', userId],
    queryFn: async () => {
      const response = await apiClient.get<User>(`/users/${userId}`);
      return response.data;
    },
    enabled: !!userId
  });
}

export function useAdminBlockSender() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ apiKeyId }: { apiKeyId: string }) => {
      await apiClient.delete(`/apikeys/${apiKeyId}`);
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
    queryKey: ['admin-advisors-overview'],
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
    queryKey: ['admin-advisors', { active }],
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
      queryClient.invalidateQueries({ queryKey: ['admin-advisors'] });
      queryClient.invalidateQueries({ queryKey: ['admin-advisors-overview'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'advisor', variables.advisorId] });
    },
    onError: (error) => {
      throw new Error(extractErrorMessage(error));
    }
  });
}

export function useAdminCreateAdvisor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      user_id: number;
      display_name?: string;
      country?: string;
      languages?: string[];
      grade?: string;
    }) => {
      const response = await apiClient.post('/admin/advisors', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-advisors'] });
      queryClient.invalidateQueries({ queryKey: ['admin-advisors-overview'] });
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
      queryClient.invalidateQueries({ queryKey: ['admin-advisors-overview'] });
      queryClient.invalidateQueries({ queryKey: ['admin-advisors'] });
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
