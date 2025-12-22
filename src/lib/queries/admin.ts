// React Query hooks encapsulating admin-specific API calls.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, extractErrorMessage, logApiError } from '../apiClient';
import { isDemoMode } from '@/lib/config';
import { demoAdminProofQueue, demoAdminStats, getDemoEscrowSummary } from '@/lib/demoData';
import type {
  AdminDashboardStats,
  AdminSender,
  AdminAdvisorListItem,
  AdminAdvisorSummary,
  AdminProofReviewItem,
  AiProofSetting,
  AdvisorProfile,
  AdvisorSenderItem,
  AdminEscrowSummary,
  ApiKey,
  PaginatedResponse,
  Proof,
  ProofDecisionRequest,
  ProofDecisionResponse,
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

type ProofReviewQueueApiItem = Proof & Partial<AdminProofReviewItem> & {
  milestone?: { name?: string };
  sender?: { email?: string };
  advisor?: { id?: string | number; email?: string; name?: string };
};

function mapProofReviewQueueItem(item: ProofReviewQueueApiItem): AdminProofReviewItem {
  return {
    id: String(item.id),
    escrow_id: String(item.escrow_id ?? ''),
    milestone_name: item.milestone_name ?? item.milestone?.name,
    sender_email: item.sender_email ?? item.sender?.email,
    description: item.description,
    type: item.type,
    status: item.status ?? 'PENDING',
    created_at: item.created_at ?? new Date().toISOString(),
    attachment_url: item.attachment_url,
    file_id: item.file_id,
    file_url: item.file_url,
    advisor_id: item.advisor_id ?? item.advisor?.id?.toString(),
    advisor_email: item.advisor_email ?? item.advisor?.email,
    advisor_name: item.advisor_name ?? item.advisor?.name,
    ai_risk_level: item.ai_risk_level ?? null,
    ai_score: item.ai_score ?? null,
    ai_explanation: item.ai_explanation ?? null,
    ai_checked_at: item.ai_checked_at ?? null
  };
}

function normalizeProofReviewQueueResponse(data: unknown): AdminProofReviewItem[] {
  const items = Array.isArray(data)
    ? data
    : Array.isArray((data as PaginatedResponse<ProofReviewQueueApiItem>)?.items)
    ? (data as PaginatedResponse<ProofReviewQueueApiItem>).items
    : [];
  return items.map(mapProofReviewQueueItem);
}

function adminProofReviewQueueKey(params: {
  limit: number;
  offset: number;
  advisor_id?: string;
  unassigned_only?: boolean;
}) {
  return ['adminProofReviewQueue', 'review_queue', params] as const;
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

export interface AdminSendersParams {
  limit?: number;
  offset?: number;
  q?: string;
}

export function useAdminSenders(params: AdminSendersParams = {}) {
  const { limit = 50, offset = 0, q } = params;

  return useQuery({
    queryKey: ['admin-senders', { limit, offset, q }],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<AdminSender>>(
        '/admin/senders',
        {
          params: { limit, offset, q }
        }
      );
      return data;
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
    queryKey: adminProofReviewQueueKey({ limit, offset, advisor_id, unassigned_only }),
    queryFn: async () => {
      if (isDemoMode()) {
        return new Promise<AdminProofReviewItem[]>((resolve) => {
          setTimeout(() => resolve(demoAdminProofQueue), 200);
        });
      }
      const response = await apiClient.get('/proofs', {
        params: {
          review_mode: 'review_queue',
          limit,
          offset,
          advisor_id,
          unassigned_only
        }
      });
      return normalizeProofReviewQueueResponse(response.data);
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

export function useAdminProofDecision() {
  const queryClient = useQueryClient();
  return useMutation<ProofDecisionResponse, Error, { proofId: string; payload: ProofDecisionRequest }>({
    mutationFn: async ({ proofId, payload }) => {
      if (isDemoMode()) {
        return new Promise<ProofDecisionResponse>((resolve) => {
          setTimeout(
            () =>
              resolve({
                id: proofId,
                escrow_id: '',
                status: payload.decision === 'approve' ? 'APPROVED' : 'REJECTED',
                created_at: new Date().toISOString(),
                description: '',
                attachment_url: '',
                file_id: '',
                file_url: '',
                ai_risk_level: null,
                ai_score: null,
                ai_explanation: null,
                ai_checked_at: null
              }),
            200
          );
        });
      }
      const response = await apiClient.post<ProofDecisionResponse>(
        `/proofs/${proofId}/decision`,
        payload
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminProofReviewQueue'] });
      queryClient.invalidateQueries({ queryKey: ['adminEscrowSummary'] });
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
