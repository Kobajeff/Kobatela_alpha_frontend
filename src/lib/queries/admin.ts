// React Query hooks encapsulating admin-specific API calls.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { apiClient, extractErrorMessage } from '../apiClient';
import { isDemoMode } from '@/lib/config';
import { demoAdminProofQueue, demoAdminStats, getDemoEscrowSummary } from '@/lib/demoData';
import {
  buildQueryString,
  createQueryKey,
  getPaginatedTotal,
  normalizePaginatedItems
} from './queryUtils';
import {
  fetchAdvisorsOverview,
  fetchAiProofSetting,
  getAdminUserApiKeys,
  getAdminUserById,
  getAdminUsers,
  issueAdminUserApiKey,
  revokeAdminUserApiKey,
  updateAiProofSetting
} from '@/lib/adminApi';
import { afterProofDecision } from '@/lib/queryInvalidation';
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
  PaginatedResponse,
  Proof,
  ProofStatus,
  ProofDecisionRequest,
  ProofDecisionResponse,
  User
} from '@/types/api';

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

function normalizeArrayResponse<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray((data as PaginatedResponse<T>)?.items)) {
    return (data as PaginatedResponse<T>).items;
  }
  return [];
}

const PENDING_PROOF_STATUSES = new Set(['PENDING', 'PENDING_REVIEW']);

function filterProofsByStatus(proofs: Proof[], status: ProofStatus) {
  const normalizedStatus = status.toUpperCase();
  if (normalizedStatus === 'PENDING') {
    return proofs.filter((proof) =>
      PENDING_PROOF_STATUSES.has(String(proof.status).toUpperCase())
    );
  }
  return proofs.filter(
    (proof) => String(proof.status).toUpperCase() === normalizedStatus
  );
}

async function fetchProofCountByStatus(status: ProofStatus) {
  const query = buildQueryString({
    review_mode: true,
    status,
    limit: 1,
    offset: 0
  });
  try {
    const response = await apiClient.get(`/proofs?${query}`);
    return { count: getPaginatedTotal<Proof>(response.data), denied: false };
  } catch (error) {
    if (isAxiosError(error)) {
      const statusCode = error.response?.status;
      if (statusCode === 403) {
        return { count: null, denied: true };
      }
      if (statusCode === 422) {
        const fallbackQuery = buildQueryString({
          review_mode: true,
          limit: 100,
          offset: 0
        });
        const response = await apiClient.get(`/proofs?${fallbackQuery}`);
        const proofs = normalizePaginatedItems<Proof>(response.data);
        return { count: filterProofsByStatus(proofs, status).length, denied: false };
      }
    }
    throw error;
  }
}

async function fetchEscrowsTotal() {
  const query = buildQueryString({ limit: 1, offset: 0 });
  try {
    const response = await apiClient.get(`/escrows?${query}`);
    return { total: getPaginatedTotal(response.data), denied: false };
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 403) {
      return { total: null, denied: true };
    }
    throw error;
  }
}

async function fetchAdminPaymentsTotal() {
  const query = buildQueryString({ limit: 1, offset: 0 });
  try {
    const response = await apiClient.get(`/admin/payments?${query}`);
    return { total: getPaginatedTotal(response.data), denied: false };
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 403) {
      return { total: null, denied: true };
    }
    throw error;
  }
}

async function postProofDecision(proofId: string, payload: ProofDecisionRequest) {
  const response = await apiClient.post<ProofDecisionResponse>(
    `/proofs/${proofId}/decision`,
    payload
  );
  return response.data;
}

function adminProofReviewQueueKey(params: {
  limit: number;
  offset: number;
  advisor_id?: string;
  unassigned_only?: boolean;
}) {
  return ['adminProofReviewQueue', 'review_queue', params] as const;
}

export type AdminDashboardComputed = Omit<
  AdminDashboardStats,
  'total_escrows' | 'pending_proofs' | 'approved_proofs' | 'rejected_proofs' | 'total_payments'
> & {
  total_escrows: number | null;
  pending_proofs: number | null;
  approved_proofs: number | null;
  rejected_proofs: number | null;
  total_payments: number | null;
  access: {
    escrowsDenied: boolean;
    paymentsDenied: boolean;
    proofsDenied: boolean;
  };
};

export function useAdminDashboardStatsComputed() {
  return useQuery<AdminDashboardComputed>({
    queryKey: createQueryKey('adminDashboardStats', { scope: 'canonical' }),
    queryFn: async () => {
      if (isDemoMode()) {
        return new Promise<AdminDashboardComputed>((resolve) => {
          setTimeout(
            () =>
              resolve({
                ...demoAdminStats,
                access: { escrowsDenied: false, paymentsDenied: false, proofsDenied: false }
              }),
            200
          );
        });
      }

      const [escrowsResult, paymentsResult, pendingResult, approvedResult, rejectedResult] =
        await Promise.all([
          fetchEscrowsTotal(),
          fetchAdminPaymentsTotal(),
          fetchProofCountByStatus('PENDING'),
          fetchProofCountByStatus('APPROVED'),
          fetchProofCountByStatus('REJECTED')
        ]);

      const proofsDenied = pendingResult.denied || approvedResult.denied || rejectedResult.denied;

      return {
        total_escrows: escrowsResult.total,
        pending_proofs: proofsDenied ? null : pendingResult.count,
        approved_proofs: proofsDenied ? null : approvedResult.count,
        rejected_proofs: proofsDenied ? null : rejectedResult.count,
        total_payments: paymentsResult.total,
        access: {
          escrowsDenied: escrowsResult.denied,
          paymentsDenied: paymentsResult.denied,
          proofsDenied
        }
      };
    }
  });
}

export interface AdminSendersParams {
  limit?: number;
  offset?: number;
  q?: string;
  active?: boolean;
}

export function useAdminSenders(params: AdminSendersParams = {}) {
  const { limit = 50, offset = 0, q, active } = params;

  return useQuery({
    queryKey: ['admin-users', { role: 'sender', limit, offset, q, active }],
    queryFn: async () => {
      return getAdminUsers({ role: 'sender', limit, offset, q, active });
    }
  });
}

export function useAdminSenderProfile(userId?: string) {
  return useQuery<User>({
    queryKey: ['admin', 'users', userId],
    queryFn: async () => {
      return getAdminUserById(String(userId));
    },
    enabled: !!userId
  });
}

export function useAdminUserApiKeys(userId?: string, params?: { active?: boolean }) {
  return useQuery<ApiKey[]>({
    queryKey: ['admin', 'users', userId, 'api-keys', params],
    queryFn: async () => {
      const raw = await getAdminUserApiKeys(String(userId), params);
      return normalizeArrayResponse<ApiKey>(raw);
    },
    enabled: !!userId
  });
}

export function useIssueAdminUserApiKey(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name }: { name?: string }) => {
      return issueAdminUserApiKey(userId, { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', userId, 'api-keys'] });
    },
    onError: (error) => {
      throw new Error(extractErrorMessage(error));
    }
  });
}

export function useRevokeAdminUserApiKey(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ apiKeyId }: { apiKeyId: string }) => {
      await revokeAdminUserApiKey(userId, apiKeyId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', userId, 'api-keys'] });
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
      return fetchAdvisorsOverview();
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
      return fetchAiProofSetting();
    }
  });
}

export function useUpdateAiProofSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (enabled: boolean) => {
      return updateAiProofSetting(enabled);
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
        `/escrows/${escrowId}/summary`
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
      return postProofDecision(proofId, payload);
    },
    onSuccess: (data) => {
      if (data.escrow_id) {
        afterProofDecision(queryClient, data.escrow_id);
        return;
      }
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
