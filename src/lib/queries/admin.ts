// React Query hooks encapsulating admin-specific API calls.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Query } from '@tanstack/query-core';
import { isAxiosError } from 'axios';
import { apiClient, extractErrorMessage } from '../apiClient';
import { isDemoMode } from '@/lib/config';
import { demoAdminProofQueue, demoAdminStats, demoPayments, getDemoEscrowSummary } from '@/lib/demoData';
import { makeRefetchInterval, pollingProfiles } from '@/lib/pollingDoctrine';
import { queryKeys } from '@/lib/queryKeys';
import { buildQueryString, getPaginatedTotal, normalizePaginatedItems, type QueryParams } from './queryUtils';
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
import { invalidateAdminDashboards, invalidateProofBundle } from '@/lib/invalidation';
import { invalidateEscrowSummary } from '@/lib/queryInvalidation';
import type {
  AlertRead,
  AdminDashboardStats,
  AdminAdvisorListItem,
  AdminAdvisorSummary,
  AdminProofReviewItem,
  AiProofSetting,
  AdvisorProfile,
  AdvisorProfileCreatePayload,
  AdvisorProfileUpdatePayload,
  AdvisorSenderItem,
  AdminEscrowSummary,
  ApiKey,
  MerchantSuggestion,
  MerchantSuggestionListResponse,
  MilestoneCreatePayload,
  PaginatedResponse,
  Payment,
  RiskFeatureSnapshotRead,
  RiskSubjectType,
  Proof,
  ProofStatus,
  ProofDecisionRequest,
  ProofDecisionResponse,
  User
} from '@/types/api';
import { getEscrowSummaryPollingFlags } from './escrowSummaryPolling';

type ProofReviewQueueApiItem = Proof & Partial<AdminProofReviewItem> & {
  milestone?: { name?: string };
  sender?: { email?: string };
  advisor?: { id?: string | number; email?: string; name?: string };
};

export interface AdminAlertsParams {
  limit?: number;
  offset?: number;
  type?: string;
  status?: string;
}

export type AdminAlertsResponse = PaginatedResponse<AlertRead>;

export interface AdminRiskSnapshotsParams {
  limit?: number;
  offset?: number;
  subject_type?: RiskSubjectType;
  subject_id?: number;
}

export type AdminRiskSnapshotsResponse = PaginatedResponse<RiskFeatureSnapshotRead>;

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
    ai_checked_at: item.ai_checked_at ?? null,
    ai_score_ml: item.ai_score_ml ?? null,
    ai_risk_level_ml: item.ai_risk_level_ml ?? null,
    ai_flags: item.ai_flags ?? null,
    ai_reviewed_by: item.ai_reviewed_by ?? null,
    ai_reviewed_at: item.ai_reviewed_at ?? null,
    invoice_total_amount: item.invoice_total_amount ?? null,
    invoice_currency: item.invoice_currency ?? null,
    payout_eligible: item.payout_eligible ?? null,
    payout_blocked_reasons: item.payout_blocked_reasons ?? null
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

function normalizeMerchantSuggestionList(
  data: MerchantSuggestionListResponse
): { items: MerchantSuggestion[]; total: number; limit?: number; offset?: number } {
  if (Array.isArray(data)) {
    return { items: data, total: data.length };
  }
  return {
    items: Array.isArray(data.items) ? data.items : [],
    total: typeof data.total === 'number' ? data.total : normalizeArrayResponse(data).length,
    limit: data.limit,
    offset: data.offset
  };
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
  const buildUrl = (endpoint: string, params: QueryParams) => {
    const query = buildQueryString(params);
    return query ? `${endpoint}?${query}` : endpoint;
  };

  const fetchFromEndpoint = async (
    endpoint: string,
    params: QueryParams,
    fallbackParams: QueryParams
  ) => {
    try {
      const response = await apiClient.get(buildUrl(endpoint, params));
      return { count: getPaginatedTotal<Proof>(response.data), denied: false };
    } catch (error) {
      if (isAxiosError(error)) {
        const statusCode = error.response?.status;
        if (statusCode === 403) {
          return { count: null, denied: true };
        }
        if (statusCode === 422) {
          try {
            const response = await apiClient.get(buildUrl(endpoint, fallbackParams));
            const proofs = normalizePaginatedItems<Proof>(response.data);
            return { count: filterProofsByStatus(proofs, status).length, denied: false };
          } catch (fallbackError) {
            if (isAxiosError(fallbackError) && fallbackError.response?.status === 403) {
              return { count: null, denied: true };
            }
            throw fallbackError;
          }
        }
      }
      throw error;
    }
  };

  try {
    return await fetchFromEndpoint(
      '/admin/proofs/review-queue',
      { status, limit: 1, offset: 0 },
      { limit: 100, offset: 0 }
    );
  } catch (error) {
    if (
      !isAxiosError(error) ||
      (error.response?.status !== 404 && error.response?.status !== 405)
    ) {
      throw error;
    }
  }

  return fetchFromEndpoint(
    '/proofs',
    { review_mode: 'review_queue', status, limit: 1, offset: 0 },
    { review_mode: 'review_queue', limit: 100, offset: 0 }
  );
}

export function useAdminAlerts(
  params: AdminAlertsParams = {},
  options?: { enabled?: boolean }
) {
  const { limit = 20, offset = 0, type, status } = params;
  const filters = useMemo(
    () => ({ limit, offset, type, status }),
    [limit, offset, status, type]
  );

  return useQuery<AdminAlertsResponse>({
    queryKey: queryKeys.admin.alerts.list(filters),
    queryFn: async () => {
      const response = await apiClient.get<AdminAlertsResponse>('/alerts', {
        params: filters
      });
      return response.data;
    },
    enabled: options?.enabled ?? true,
    retry: (failureCount, error) => {
      if (isAxiosError(error)) {
        const statusCode = error.response?.status;
        if (statusCode === 401 || statusCode === 403) {
          return false;
        }
      }
      return failureCount < 2;
    }
  });
}

export function useAdminRiskSnapshots(
  params: AdminRiskSnapshotsParams = {},
  options?: { enabled?: boolean }
) {
  const { limit = 20, offset = 0, subject_type, subject_id } = params;
  const filters = useMemo(
    () => ({ limit, offset, subject_type, subject_id }),
    [limit, offset, subject_id, subject_type]
  );

  return useQuery<AdminRiskSnapshotsResponse>({
    queryKey: queryKeys.admin.riskSnapshots.list(filters),
    queryFn: async () => {
      // Contract: docs/Backend_info/API_GUIDE (12).md — GET /admin/risk-snapshots — scopes admin/support
      const response = await apiClient.get<AdminRiskSnapshotsResponse>('/admin/risk-snapshots', {
        params: filters
      });
      return response.data;
    },
    enabled: options?.enabled ?? true,
    retry: (failureCount, error) => {
      if (isAxiosError(error)) {
        const statusCode = error.response?.status;
        if (statusCode === 401 || statusCode === 403) {
          return false;
        }
      }
      return failureCount < 2;
    }
  });
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

export interface AdminPaymentsParams extends QueryParams {
  limit?: number;
  offset?: number;
  escrow_id?: string;
  status?: string;
  payment_id?: string;
  id?: string;
}

export type AdminPaymentsResponse = {
  items: Payment[];
  total: number;
};

export interface AdminMerchantSuggestionParams extends QueryParams {
  limit?: number;
  offset?: number;
  status?: string;
  q?: string;
}

export type AdminMerchantSuggestionList = {
  items: MerchantSuggestion[];
  total: number;
  limit?: number;
  offset?: number;
};

async function fetchAdminPayments(params: AdminPaymentsParams) {
  const query = buildQueryString(params);
  const response = await apiClient.get(`/admin/payments?${query}`);
  return {
    items: normalizePaginatedItems<Payment>(response.data),
    total: getPaginatedTotal<Payment>(response.data)
  };
}

async function fetchAdminMerchantSuggestions(params: AdminMerchantSuggestionParams) {
  const query = buildQueryString(params);
  const response = await apiClient.get<MerchantSuggestionListResponse>(
    query ? `/admin/merchant-suggestions?${query}` : '/admin/merchant-suggestions'
  );
  return normalizeMerchantSuggestionList(response.data);
}

async function postProofDecision(proofId: string, payload: ProofDecisionRequest) {
  const response = await apiClient.post<ProofDecisionResponse>(
    `/proofs/${proofId}/decision`,
    payload
  );
  return response.data;
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
    queryKey: queryKeys.admin.dashboardStats(),
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

export function useAdminPayments(
  params: AdminPaymentsParams = {},
  options?: {
    enabled?: boolean;
    refetchInterval?: (query: Query<AdminPaymentsResponse>) => number | false;
  }
) {
  const { limit = 50, offset = 0, escrow_id, status, payment_id, id } = params;
  const filters = useMemo(
    () => ({ limit, offset, escrow_id, status, payment_id, id }),
    [escrow_id, id, limit, offset, payment_id, status]
  );

  return useQuery<AdminPaymentsResponse>({
    queryKey: queryKeys.payments.adminList(filters),
    queryFn: async () => {
      if (isDemoMode()) {
        return new Promise<AdminPaymentsResponse>((resolve) => {
          setTimeout(
            () =>
              resolve({
                items: demoPayments,
                total: demoPayments.length
              }),
            200
          );
        });
      }
      return fetchAdminPayments(filters);
    },
    enabled: options?.enabled,
    refetchInterval: options?.refetchInterval,
    retry: (failureCount, error) => {
      if (isAxiosError(error)) {
        const statusCode = error.response?.status;
        if (statusCode === 403 || statusCode === 404) {
          return false;
        }
      }
      return failureCount < 2;
    }
  });
}

export function useAdminMerchantSuggestions(
  params: AdminMerchantSuggestionParams = {},
  options?: { enabled?: boolean }
) {
  const { limit = 50, offset = 0, status, q } = params;
  const filters = useMemo(() => ({ limit, offset, status, q }), [limit, offset, q, status]);
  return useQuery<AdminMerchantSuggestionList>({
    queryKey: queryKeys.admin.merchantSuggestions.list(filters),
    queryFn: async () => fetchAdminMerchantSuggestions(filters),
    enabled: options?.enabled,
    retry: (failureCount, error) => {
      if (isAxiosError(error)) {
        const statusCode = error.response?.status;
        if (statusCode === 403 || statusCode === 404) {
          return false;
        }
      }
      return failureCount < 2;
    }
  });
}

export function useExecutePayment() {
  const queryClient = useQueryClient();
  return useMutation<Payment, unknown, { paymentId: string }>({
    mutationFn: async ({ paymentId }) => {
      const response = await apiClient.post<Payment>(`/payments/execute/${paymentId}`);
      return response.data;
    },
    retry: false,
    onSuccess: (payment) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.adminListBase() });
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.byId(payment.id) });
      invalidateAdminDashboards(queryClient);
      if (payment?.escrow_id) {
        invalidateEscrowSummary(queryClient, payment.escrow_id);
      }
    }
  });
}

export function useApproveMerchantSuggestion() {
  const queryClient = useQueryClient();
  return useMutation<void, unknown, { id: string }>({
    mutationFn: async ({ id }) => {
      await apiClient.post(`/admin/merchant-suggestions/${id}/approve`);
    },
    retry: (failureCount, error) => {
      if (isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 403 || status === 404 || status === 409 || status === 422) {
          return false;
        }
      }
      return failureCount < 2;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.merchantSuggestions.listBase() });
    }
  });
}

export function useRejectMerchantSuggestion() {
  const queryClient = useQueryClient();
  return useMutation<void, unknown, { id: string }>({
    mutationFn: async ({ id }) => {
      await apiClient.post(`/admin/merchant-suggestions/${id}/reject`);
    },
    retry: (failureCount, error) => {
      if (isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 403 || status === 404 || status === 409 || status === 422) {
          return false;
        }
      }
      return failureCount < 2;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.merchantSuggestions.listBase() });
    }
  });
}

export function usePromoteMerchantSuggestion() {
  const queryClient = useQueryClient();
  return useMutation<void, unknown, { id: string }>({
    mutationFn: async ({ id }) => {
      await apiClient.post(`/admin/merchant-suggestions/${id}/promote`);
    },
    retry: (failureCount, error) => {
      if (isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 403 || status === 404 || status === 409 || status === 422) {
          return false;
        }
      }
      return failureCount < 2;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.merchantSuggestions.listBase() });
    }
  });
}

export interface AdminSendersParams {
  limit?: number;
  offset?: number;
  q?: string;
  active?: boolean;
}

export interface AdminUsersParams {
  role?: string;
  limit?: number;
  offset?: number;
  q?: string;
  active?: boolean;
}

export function useAdminUsers(params: AdminUsersParams = {}, options?: { enabled?: boolean }) {
  const { role, limit = 50, offset = 0, q, active } = params;
  const filters = useMemo(
    () => ({ role, limit, offset, q, active }),
    [active, limit, offset, q, role]
  );

  return useQuery({
    queryKey: queryKeys.admin.users.list(filters),
    queryFn: async () => {
      return getAdminUsers({ role, limit, offset, q, active });
    },
    enabled: options?.enabled ?? true
  });
}

export function useAdminSenders(params: AdminSendersParams = {}) {
  const { limit = 50, offset = 0, q, active } = params;
  const filters = useMemo(
    () => ({ role: 'sender', limit, offset, q, active }),
    [active, limit, offset, q]
  );

  return useQuery({
    queryKey: queryKeys.admin.users.list(filters),
    queryFn: async () => {
      return getAdminUsers({ role: 'sender', limit, offset, q, active });
    }
  });
}

export function useAdminSenderProfile(userId?: string) {
  return useQuery<User>({
    queryKey: queryKeys.admin.users.byId(userId),
    queryFn: async () => {
      return getAdminUserById(String(userId));
    },
    enabled: !!userId
  });
}

export function useAdminUserProfile(userId?: string) {
  return useQuery<User>({
    queryKey: queryKeys.admin.users.byId(userId),
    queryFn: async () => {
      return getAdminUserById(String(userId));
    },
    enabled: !!userId
  });
}

export function useAdminUserApiKeys(userId?: string, params?: { active?: boolean }) {
  const apiKeyParams = useMemo(
    () => (params ? { active: params.active } : undefined),
    [params]
  );
  return useQuery<ApiKey[]>({
    queryKey: queryKeys.admin.users.apiKeys(userId, apiKeyParams),
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
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users.apiKeysBase(userId) });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users.apiKeysBase(userId) });
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
  const filters = useMemo(
    () => ({ limit, offset, advisor_id, unassigned_only }),
    [advisor_id, limit, offset, unassigned_only]
  );
  return useQuery<AdminProofReviewItem[]>({
    queryKey: queryKeys.admin.proofReviewQueue(filters),
    queryFn: async () => {
      if (isDemoMode()) {
        return new Promise<AdminProofReviewItem[]>((resolve) => {
          setTimeout(() => resolve(demoAdminProofQueue), 200);
        });
      }
      // Contract: GET /admin/proofs/review-queue (API_GUIDE.md — Admin tools / support operations)
      const response = await apiClient.get('/admin/proofs/review-queue', {
        params: {
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
    queryKey: queryKeys.admin.advisors.overview(),
    queryFn: async () => {
      return fetchAdvisorsOverview();
    }
  });
}

export function useAdminAdvisorsList(active?: boolean) {
  const filters = useMemo(() => ({ active }), [active]);
  return useQuery<AdminAdvisorListItem[]>({
    queryKey: queryKeys.admin.advisors.list(filters),
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
    queryKey: queryKeys.admin.settings.aiProof(),
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
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.settings.aiProof() });
    }
  });
}

type AdminEscrowSummaryPollingState = {
  fundingActive: boolean;
  milestoneActive: boolean;
  payoutActive: boolean;
  timedOut: boolean;
  blocked: boolean;
};

export function useAdminEscrowSummary(
  escrowId: string,
  options?: {
    fundingInProgress?: boolean;
    includeMilestones?: boolean;
    includeProofs?: boolean;
    proofsLimit?: number;
  }
) {
  const [pollingTimeouts, setPollingTimeouts] = useState<Record<string, boolean>>({
    [pollingProfiles.fundingEscrow.name]: false,
    [pollingProfiles.milestoneProgression.name]: false,
    [pollingProfiles.payoutStatus.name]: false
  });
  const pollingTimeoutsRef = useRef(pollingTimeouts);
  const [pollingBlocked, setPollingBlocked] = useState(false);
  const pollingBlockedRef = useRef(pollingBlocked);
  const startTimesRef = useRef<Record<string, number>>({});
  const timeoutIdsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const fundingInProgress = options?.fundingInProgress;

  useEffect(() => {
    pollingTimeoutsRef.current = pollingTimeouts;
  }, [pollingTimeouts]);

  useEffect(() => {
    pollingBlockedRef.current = pollingBlocked;
  }, [pollingBlocked]);

  useEffect(() => {
    return () => {
      Object.values(timeoutIdsRef.current).forEach((timeoutId) => clearTimeout(timeoutId));
      timeoutIdsRef.current = {};
    };
  }, []);

  const summaryParams = useMemo(
    () => ({
      include_milestones: options?.includeMilestones ?? true,
      include_proofs: options?.includeProofs ?? true,
      proofs_limit: options?.proofsLimit
    }),
    [options?.includeMilestones, options?.includeProofs, options?.proofsLimit]
  );

  const refetchInterval = useCallback(
    (query: Query<AdminEscrowSummary>) => {
      if (!escrowId || pollingBlockedRef.current) return false;

      const summary = query.state.data as AdminEscrowSummary | undefined;
      const flags = getEscrowSummaryPollingFlags(summary, { fundingInProgress });
      const activeProfiles = [
        flags.fundingActive ? pollingProfiles.fundingEscrow : null,
        flags.milestoneActive ? pollingProfiles.milestoneProgression : null,
        flags.payoutActive ? pollingProfiles.payoutStatus : null
      ].filter(Boolean) as Array<(typeof pollingProfiles)[keyof typeof pollingProfiles]>;

      if (activeProfiles.length === 0) return false;

      const intervals = activeProfiles
        .map((profile) => {
          if (pollingTimeoutsRef.current[profile.name]) return false;
          const startTime = startTimesRef.current[profile.name] ?? Date.now();
          startTimesRef.current[profile.name] = startTime;
          return makeRefetchInterval(
            profile,
            () => Date.now() - startTimesRef.current[profile.name],
            () => summary
          )();
        })
        .filter((value): value is number => typeof value === 'number');

      if (intervals.length === 0) return false;

      return Math.min(...intervals);
    },
    [escrowId, fundingInProgress]
  );

  const query = useQuery<AdminEscrowSummary>({
    queryKey: queryKeys.escrows.summary(escrowId, 'admin', summaryParams),
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
      // Contract: docs/Backend_info/API_GUIDE (11).md — GET /admin/escrows/{escrow_id}/summary — admin/support
      const response = await apiClient.get<AdminEscrowSummary>(
        `/admin/escrows/${escrowId}/summary`,
        {
          params: summaryParams
        }
      );
      return response.data;
    },
    enabled: !!escrowId,
    refetchInterval,
    retry: (failureCount, error) => {
      if (isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 403 || status === 404 || status === 410) {
          return false;
        }
      }
      return failureCount < 2;
    }
  });

  const pollingFlags = useMemo(
    () => getEscrowSummaryPollingFlags(query.data, { fundingInProgress }),
    [query.data, fundingInProgress]
  );

  useEffect(() => {
    const status = isAxiosError(query.error) ? query.error.response?.status : null;
    if (status === 403 || status === 404 || status === 410) {
      setPollingBlocked(true);
    } else {
      setPollingBlocked(false);
    }
  }, [query.error]);

  useEffect(() => {
    const profiles = [
      { profile: pollingProfiles.fundingEscrow, active: pollingFlags.fundingActive },
      { profile: pollingProfiles.milestoneProgression, active: pollingFlags.milestoneActive },
      { profile: pollingProfiles.payoutStatus, active: pollingFlags.payoutActive }
    ];

    profiles.forEach(({ profile, active }) => {
      if (!active || pollingBlocked) {
        if (timeoutIdsRef.current[profile.name]) {
          clearTimeout(timeoutIdsRef.current[profile.name]);
          delete timeoutIdsRef.current[profile.name];
        }
        if (startTimesRef.current[profile.name]) {
          delete startTimesRef.current[profile.name];
        }
        if (pollingTimeoutsRef.current[profile.name]) {
          setPollingTimeouts((prev) =>
            prev[profile.name]
              ? { ...prev, [profile.name]: false }
              : prev
          );
        }
        return;
      }

      if (!startTimesRef.current[profile.name]) {
        startTimesRef.current[profile.name] = Date.now();
      }

      if (!timeoutIdsRef.current[profile.name]) {
        timeoutIdsRef.current[profile.name] = setTimeout(() => {
          setPollingTimeouts((prev) => ({ ...prev, [profile.name]: true }));
        }, profile.maxDurationMs);
      }
    });
  }, [pollingBlocked, pollingFlags.fundingActive, pollingFlags.milestoneActive, pollingFlags.payoutActive]);

  const polling: AdminEscrowSummaryPollingState = {
    fundingActive: pollingFlags.fundingActive,
    milestoneActive: pollingFlags.milestoneActive,
    payoutActive: pollingFlags.payoutActive,
    timedOut: Object.values(pollingTimeouts).some(Boolean),
    blocked: pollingBlocked
  };

  return { ...query, polling };
}

async function createMilestone(escrowId: string, payload: MilestoneCreatePayload) {
  if (isDemoMode()) {
    return new Promise<MilestoneCreatePayload>((resolve) => {
      setTimeout(() => resolve(payload), 200);
    });
  }
  const response = await apiClient.post(`/escrows/${escrowId}/milestones`, payload);
  return response.data;
}

export function useCreateMilestone(escrowId: string) {
  const queryClient = useQueryClient();
  return useMutation<unknown, Error, MilestoneCreatePayload>({
    mutationFn: (payload) => createMilestone(escrowId, payload),
    retry: false,
    onSettled: () => {
      if (!escrowId) return;
      queryClient.invalidateQueries({ queryKey: queryKeys.milestones.byEscrow(escrowId) });
      invalidateEscrowSummary(queryClient, escrowId);
      queryClient.invalidateQueries({ queryKey: queryKeys.escrows.byId(escrowId) });
    }
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
        invalidateProofBundle(queryClient, {
          proofId: data.id,
          escrowId: data.escrow_id,
          viewer: 'admin'
        });
        invalidateAdminDashboards(queryClient);
        return;
      }
      invalidateAdminDashboards(queryClient);
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.proofReviewQueueBase() });
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'escrows' &&
          query.queryKey[2] === 'summary' &&
          query.queryKey[3] === 'admin'
      });
    }
  });
}

export function useAdminAdvisorDetail(advisorId: number) {
  return useQuery<AdvisorProfile>({
    queryKey: queryKeys.admin.advisors.detail(advisorId),
    queryFn: async () => {
      const response = await apiClient.get<AdvisorProfile>(`/admin/advisors/${advisorId}`);
      return response.data;
    },
    enabled: !!advisorId
  });
}

export function useAdminAdvisorSenders(advisorId: number) {
  return useQuery<AdvisorSenderItem[]>({
    queryKey: queryKeys.admin.advisors.senders(advisorId),
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
    mutationFn: async (params: { advisorId: number; data: AdvisorProfileUpdatePayload }) => {
      const { advisorId, data } = params;
      const response = await apiClient.patch(`/admin/advisors/${advisorId}`, data);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.advisors.listBase() });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.advisors.overview() });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.advisors.detail(variables.advisorId) });
    },
    onError: (error) => {
      throw new Error(extractErrorMessage(error));
    }
  });
}

export function useAdminCreateAdvisor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AdvisorProfileCreatePayload) => {
      const response = await apiClient.post('/admin/advisors', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.advisors.listBase() });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.advisors.overview() });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.advisors.senders(variables.advisorId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.advisors.overview() });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.advisors.listBase() });
    },
    onError: (error) => {
      throw new Error(extractErrorMessage(error));
    }
  });
}
