"use client";

// React Query hooks encapsulating sender-specific API calls.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Query } from '@tanstack/query-core';
import { isAxiosError } from 'axios';
import { apiClient, extractErrorMessage } from '../apiClient';
import { normalizeApiError } from '../apiError';
import { isNoAdvisorAvailable } from '../errors';
import { setAuthToken } from '../auth';
import { resetSession } from '../sessionReset';
import { getDemoRole, isDemoMode } from '@/lib/config';
import { invalidateEscrowBundle, invalidateProofBundle } from '@/lib/invalidation';
import { makeRefetchInterval, pollingProfiles } from '@/lib/pollingDoctrine';
import { queryKeys } from '@/lib/queryKeys';
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
  EscrowCreatePayload,
  EscrowListItem,
  AuthLoginResponse,
  AuthUser,
  Milestone,
  MilestoneStatus,
  Payment,
  Proof,
  ProofStatus,
  AdvisorProfile,
  SenderDashboard,
  SenderEscrowSummary,
  AuthMeResponse,
  MerchantSuggestion,
  MerchantSuggestionCreatePayload
} from '@/types/api';
import { buildQueryString, getPaginatedLimitOffset, getPaginatedTotal, normalizePaginatedItems } from './queryUtils';
import { getEscrowSummaryPollingFlags } from './escrowSummaryPolling';

const PENDING_PROOF_STATUSES = new Set(['PENDING', 'PENDING_REVIEW']);
const ACTIVE_MILESTONE_STATUSES = new Set<MilestoneStatus>(['PENDING_REVIEW', 'PAYING']);

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

async function fetchProofsWithStatus({
  status,
  mine,
  limit,
  offset,
  fallbackLimit
}: {
  status: ProofStatus;
  mine?: boolean;
  limit: number;
  offset: number;
  fallbackLimit: number;
}) {
  const query = buildQueryString({ mine, status, limit, offset });
  try {
    const response = await apiClient.get(`/proofs?${query}`);
    return normalizePaginatedItems<Proof>(response.data);
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 422) {
      const fallbackQuery = buildQueryString({
        mine,
        limit: fallbackLimit,
        offset
      });
      const response = await apiClient.get(`/proofs?${fallbackQuery}`);
      const proofs = normalizePaginatedItems<Proof>(response.data);
      return filterProofsByStatus(proofs, status);
    }
    throw error;
  }
}

function normalizeMerchantSuggestionList(
  data: unknown,
  fallbackLimit: number,
  fallbackOffset: number
) {
  const items = normalizePaginatedItems<MerchantSuggestion>(data);
  const total = getPaginatedTotal<MerchantSuggestion>(data);
  const { limit, offset } = getPaginatedLimitOffset<MerchantSuggestion>(data);
  return {
    items,
    total,
    limit: typeof limit === 'number' ? limit : fallbackLimit,
    offset: typeof offset === 'number' ? offset : fallbackOffset
  };
}

export function useMerchantSuggestionsList(params: { limit?: number; offset?: number } = {}) {
  const { limit = 10, offset = 0 } = params;
  const queryParams = useMemo(() => ({ limit, offset }), [limit, offset]);
  return useQuery({
    queryKey: queryKeys.sender.merchantSuggestions.list(queryParams),
    queryFn: async () => {
      if (isDemoMode()) {
        return {
          items: [],
          total: 0,
          limit,
          offset
        };
      }
      const search = buildQueryString({ limit, offset });
      const response = await apiClient.get(`/merchant-suggestions${search ? `?${search}` : ''}`);
      return normalizeMerchantSuggestionList(response.data, limit, offset);
    }
  });
}

export function useMerchantSuggestion(id?: string) {
  return useQuery<MerchantSuggestion>({
    queryKey: queryKeys.sender.merchantSuggestions.byId(id),
    queryFn: async () => {
      if (!id) throw new Error('Missing merchant suggestion id');
      const response = await apiClient.get<MerchantSuggestion>(`/merchant-suggestions/${id}`);
      return response.data;
    },
    enabled: Boolean(id)
  });
}

export function useCreateMerchantSuggestion() {
  const queryClient = useQueryClient();
  return useMutation<MerchantSuggestion, Error, MerchantSuggestionCreatePayload>({
    mutationFn: async (payload) => {
      const response = await apiClient.post<MerchantSuggestion>('/merchant-suggestions', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sender.merchantSuggestions.listBase() });
    },
    onError: (error) => {
      throw new Error(extractErrorMessage(error));
    }
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation<AuthLoginResponse, Error, { email: string }>({
    mutationFn: async ({ email }) => {
      if (isDemoMode()) {
        const role = getDemoRole();
        const user = getDemoUserByRole(role);
        return new Promise((resolve) => {
          setTimeout(() =>
            resolve({
              user,
              access_token: 'demo-token'
            } as AuthLoginResponse), 200);
        });
      }

      const response = await apiClient.post<AuthLoginResponse>('/auth/login', { email });
      return response.data;
    },
    onSuccess: (data) => {
      const token = data.token ?? data.access_token;
      if (token) {
        setAuthToken(token);
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() });
    },
    onError: (error) => {
      throw new Error(extractErrorMessage(error));
    }
  });
}

export function useMyAdvisor() {
  return useQuery<AdvisorProfile | null>({
    queryKey: queryKeys.sender.myAdvisor(),
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
        if (isAxiosError(error)) {
          const status = error.response?.status;
          if (status === 404) {
            return null;
          }

          if (isNoAdvisorAvailable(error)) {
            throw error;
          }
        }
        throw error;
      }
    }
  });
}

export function useAuthMe() {
  const queryClient = useQueryClient();
  const query = useQuery<AuthUser, Error>({
    queryKey: queryKeys.auth.me(),
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

  return query;
}

export function useMyProfile() {
  return useAuthMe();
}

export function useSenderDashboard() {
  return useQuery<SenderDashboard>({
    queryKey: queryKeys.sender.dashboard(),
    queryFn: async () => {
      if (isDemoMode()) {
        const recentEscrows = demoEscrows.slice(0, 3);
        const pendingProofs = demoProofs.filter((p) => p.status === 'PENDING');
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
      const escrowsQuery = buildQueryString({ mine: true, limit: 5, offset: 0 });
      const escrowsResponse = await apiClient.get(`/escrows?${escrowsQuery}`);
      const escrows = normalizePaginatedItems<EscrowListItem>(escrowsResponse.data);

      const pendingProofs = await fetchProofsWithStatus({
        status: 'PENDING',
        mine: true,
        limit: 5,
        offset: 0,
        fallbackLimit: 50
      });

      const escrowsForPayments = escrows.slice(0, 5);
      const summaries = await Promise.allSettled(
        escrowsForPayments.map((escrow) =>
          apiClient.get<SenderEscrowSummary>(`/escrows/${escrow.id}/summary`)
        )
      );

      const payments = summaries.flatMap((result) =>
        result.status === 'fulfilled'
          ? (result.value.data.payments ?? [])
          : []
      );

      const recentPayments = payments
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

      return {
        recent_escrows: escrows as EscrowListItem[],
        pending_proofs: pendingProofs,
        recent_payments: recentPayments
      };
    }
  });
}

export function useSenderEscrows(params: { status?: string; limit?: number; offset?: number } = {}) {
  const { status, limit = 20, offset = 0 } = params;
  const filters = useMemo(
    () => ({ status, limit, offset, mine: true }),
    [limit, offset, status]
  );
  return useQuery<EscrowListItem[]>({
    queryKey: queryKeys.escrows.list(filters),
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

export function useCreateEscrow() {
  const queryClient = useQueryClient();
  return useMutation<EscrowListItem, Error, EscrowCreatePayload>({
    mutationFn: async (payload) => {
      if (isDemoMode()) {
        const now = new Date().toISOString();
        return new Promise<EscrowListItem>((resolve) => {
          setTimeout(
            () =>
              resolve({
                id: `demo-escrow-${Date.now()}`,
                status: 'DRAFT',
                amount: payload.amount,
                currency: payload.currency,
                created_at: now,
                updated_at: now
              }),
            200
          );
        });
      }
      const response = await apiClient.post<EscrowListItem>('/escrows', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.escrows.listBase() });
      queryClient.invalidateQueries({ queryKey: queryKeys.sender.dashboard() });
    },
    onError: (error) => {
      throw new Error(extractErrorMessage(error));
    }
  });
}

type SenderEscrowSummaryPollingState = {
  fundingActive: boolean;
  milestoneActive: boolean;
  payoutActive: boolean;
  timedOut: boolean;
  blocked: boolean;
};

export function useSenderEscrowSummary(
  escrowId: string,
  options?: { fundingInProgress?: boolean }
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

  const refetchInterval = useCallback(
    (query: Query<SenderEscrowSummary>) => {
      if (!escrowId || pollingBlockedRef.current) return false;

      const summary = query.state.data as SenderEscrowSummary | undefined;
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

  const query = useQuery<SenderEscrowSummary>({
    queryKey: queryKeys.escrows.summary(escrowId, 'sender'),
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
    enabled: Boolean(escrowId),
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

  const polling: SenderEscrowSummaryPollingState = {
    fundingActive: pollingFlags.fundingActive,
    milestoneActive: pollingFlags.milestoneActive,
    payoutActive: pollingFlags.payoutActive,
    timedOut: Object.values(pollingTimeouts).some(Boolean),
    blocked: pollingBlocked
  };

  return { ...query, polling };
}

async function listEscrowMilestones(escrowId: string) {
  if (isDemoMode()) {
    const summary = getDemoEscrowSummary(escrowId);
    return new Promise<Milestone[]>((resolve, reject) => {
      setTimeout(() => {
        if (!summary) {
          reject(new Error('Escrow not found in demo data'));
          return;
        }
        resolve(summary.milestones ?? []);
      }, 200);
    });
  }
  const response = await apiClient.get<Milestone[]>(`/escrows/${escrowId}/milestones`);
  return response.data;
}

async function getMilestone(milestoneId: string) {
  if (isDemoMode()) {
    const milestone = demoEscrows
      .map((escrow) => getDemoEscrowSummary(escrow.id))
      .flatMap((summary) => summary?.milestones ?? [])
      .find((entry) => entry.id === milestoneId);
    return new Promise<Milestone>((resolve, reject) => {
      setTimeout(() => {
        if (!milestone) {
          reject(new Error('Milestone not found in demo data'));
          return;
        }
        resolve(milestone);
      }, 200);
    });
  }
  const response = await apiClient.get<Milestone>(`/escrows/milestones/${milestoneId}`);
  return response.data;
}

function isMilestoneInProgress(status?: MilestoneStatus | null) {
  if (!status) return false;
  return ACTIVE_MILESTONE_STATUSES.has(String(status).toUpperCase() as MilestoneStatus);
}

export function useEscrowMilestones(escrowId: string) {
  const startTimeRef = useRef<number | null>(null);
  const refetchHandledRef = useRef(false);
  const query = useQuery<Milestone[]>({
    queryKey: queryKeys.milestones.byEscrow(escrowId),
    queryFn: () => listEscrowMilestones(escrowId),
    enabled: Boolean(escrowId),
    refetchInterval: (queryInstance) => {
      if (!escrowId) return false;
      const milestones = queryInstance.state.data ?? [];
      const shouldPoll = milestones.some((milestone) =>
        isMilestoneInProgress(milestone.status)
      );
      if (!shouldPoll) {
        startTimeRef.current = null;
        return false;
      }
      const startTime = startTimeRef.current ?? Date.now();
      startTimeRef.current = startTime;
      return makeRefetchInterval(
        pollingProfiles.milestoneProgression,
        () => Date.now() - startTime,
        () => ({ milestones })
      )();
    },
    retry: (failureCount, error) => {
      if (isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 403 || status === 404 || status === 410 || status === 409 || status === 422) {
          return false;
        }
      }
      return failureCount < 2;
    }
  });

  useEffect(() => {
    if (!query.error || refetchHandledRef.current) return;
    const status = normalizeApiError(query.error).status;
    if (status === 409 || status === 422) {
      refetchHandledRef.current = true;
      query.refetch();
    }
  }, [query, query.error]);

  return query;
}

export function useMilestoneDetail(milestoneId: string) {
  const refetchHandledRef = useRef(false);
  const query = useQuery<Milestone>({
    queryKey: queryKeys.milestones.byId(milestoneId),
    queryFn: () => getMilestone(milestoneId),
    enabled: Boolean(milestoneId),
    retry: (failureCount, error) => {
      if (isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 403 || status === 404 || status === 410 || status === 409 || status === 422) {
          return false;
        }
      }
      return failureCount < 2;
    }
  });

  useEffect(() => {
    if (!query.error || refetchHandledRef.current) return;
    const status = normalizeApiError(query.error).status;
    if (status === 409 || status === 422) {
      refetchHandledRef.current = true;
      query.refetch();
    }
  }, [query, query.error]);

  return query;
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
      invalidateEscrowBundle(queryClient, {
        escrowId,
        viewer: 'sender',
        refetchSummary: true
      });
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

export type FundingSessionResponse = unknown;

export function useCreateFundingSession(escrowId: string) {
  const queryClient = useQueryClient();
  return useMutation<FundingSessionResponse, Error, void>({
    mutationFn: async () => {
      if (isDemoMode()) {
        return new Promise((resolve) => {
          setTimeout(() => resolve({}), 200);
        });
      }
      const response = await apiClient.post<FundingSessionResponse>(
        `/escrows/${escrowId}/funding-session`,
        {}
      );
      return response.data;
    },
    retry: false,
    onSuccess: () => {
      invalidateEscrowBundle(queryClient, {
        escrowId,
        viewer: 'sender',
        refetchSummary: true
      });
    },
    onError: (error) => {
      if (!isAxiosError(error)) return;
      const status = error.response?.status;
      if (status === 409 || status === 422) {
        invalidateEscrowBundle(queryClient, {
          escrowId,
          viewer: 'sender',
          refetchSummary: true
        });
      }
    }
  });
}

export type EscrowDepositResponse = unknown;

type DepositPayload = {
  idempotencyKey: string;
};

export function useDepositEscrow(escrowId: string) {
  const queryClient = useQueryClient();
  return useMutation<EscrowDepositResponse, Error, DepositPayload>({
    mutationFn: async ({ idempotencyKey }) => {
      if (isDemoMode()) {
        return new Promise((resolve) => {
          setTimeout(() => resolve({}), 200);
        });
      }
      const response = await apiClient.post<EscrowDepositResponse>(
        `/escrows/${escrowId}/deposit`,
        {},
        {
          headers: {
            'Idempotency-Key': idempotencyKey
          }
        }
      );
      return response.data;
    },
    retry: (failureCount, error) => {
      if (!isAxiosError(error)) return false;
      if (failureCount >= 3) return false;
      if (!error.response) return true;
      return error.response.status === 500;
    },
    retryDelay: (attempt) => {
      const delays = [1000, 2000, 4000];
      return delays[Math.min(attempt - 1, delays.length - 1)];
    },
    onSuccess: () => {
      invalidateEscrowBundle(queryClient, {
        escrowId,
        viewer: 'sender',
        refetchSummary: true
      });
    },
    onError: (error) => {
      if (!isAxiosError(error)) return;
      const status = error.response?.status;
      if (status === 409 || status === 422) {
        invalidateEscrowBundle(queryClient, {
          escrowId,
          viewer: 'sender',
          refetchSummary: true
        });
      }
    }
  });
}

type ProofReviewPollingState = {
  active: boolean;
  errorMessage?: string | null;
};

type ProofLookupParams = {
  proofId: string;
  escrowId?: string;
};

const PROOF_POLLING_LIST_LIMIT = 100;

function createProofStatusError(message: string, status: number) {
  const error = new Error(message) as Error & { status?: number };
  error.status = status;
  return error;
}

async function fetchProofViaList({ proofId }: ProofLookupParams) {
  const query = buildQueryString({
    mine: true,
    limit: PROOF_POLLING_LIST_LIMIT,
    offset: 0
  });
  const response = await apiClient.get(`/proofs?${query}`);
  const proofs = normalizePaginatedItems<Proof>(response.data);
  const match = proofs.find((proof) => String(proof.id) === String(proofId));
  if (!match) {
    throw createProofStatusError('Preuve introuvable', 404);
  }
  return match;
}

export function useProofReviewPolling(proofId: string | null, escrowId: string) {
  const queryClient = useQueryClient();
  const [stopPolling, setStopPolling] = useState(false);
  const [serverErrorMessage, setServerErrorMessage] = useState<string | null>(null);
  const [conflictRefetched, setConflictRefetched] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const refreshedSummaryRef = useRef(false);
  const demoFetchCountRef = useRef(0);

  useEffect(() => {
    if (!proofId) {
      setStopPolling(false);
      setServerErrorMessage(null);
      setConflictRefetched(false);
      startTimeRef.current = null;
      refreshedSummaryRef.current = false;
      demoFetchCountRef.current = 0;
      return;
    }
    setStopPolling(false);
    setServerErrorMessage(null);
    setConflictRefetched(false);
    startTimeRef.current = null;
    refreshedSummaryRef.current = false;
    demoFetchCountRef.current = 0;
  }, [proofId]);

  useEffect(() => {
    if (!proofId || stopPolling) return undefined;
    const timeoutId = setTimeout(() => {
      setStopPolling(true);
    }, pollingProfiles.proofReview.maxDurationMs);
    return () => clearTimeout(timeoutId);
  }, [proofId, stopPolling]);

  const query = useQuery<Proof, Error>({
    queryKey: queryKeys.proofs.byId(proofId),
    queryFn: async () => {
      if (!proofId) {
        throw new Error('Proof id is required');
      }
      if (isDemoMode()) {
        demoFetchCountRef.current += 1;
        const status = demoFetchCountRef.current < 2 ? 'PENDING' : 'APPROVED';
        return {
          id: proofId,
          escrow_id: escrowId,
          description: 'Demo proof',
          attachment_url: 'https://demo.kobatela.com/files/demo-proof.pdf',
          file_id: 'demo-file-id',
          status,
          created_at: new Date().toISOString(),
          ai_risk_level: null,
          ai_score: null,
          ai_explanation: null,
          ai_checked_at: null
        };
      }
      return fetchProofViaList({ proofId, escrowId });
    },
    enabled: Boolean(proofId) && !stopPolling,
    refetchInterval: (queryInstance) => {
      if (!proofId || stopPolling) return false;
      const startTime = startTimeRef.current ?? Date.now();
      startTimeRef.current = startTime;
      return makeRefetchInterval(
        pollingProfiles.proofReview,
        () => Date.now() - startTime,
        () => queryInstance.state.data
      )();
    },
    retry: (failureCount, error) => {
      const status = normalizeApiError(error).status;
      if (status && status >= 500) {
        return failureCount < 3;
      }
      return false;
    }
  });

  useEffect(() => {
    if (!query.error) return;
    const status = normalizeApiError(query.error).status;
    if (status && status >= 500) {
      setServerErrorMessage(
        "Le statut de la preuve ne peut pas être rafraîchi pour le moment. Réessayez plus tard."
      );
      setStopPolling(true);
    }
    if (status === 404 || status === 410) {
      setServerErrorMessage('Preuve introuvable.');
      setStopPolling(true);
    }
    if (status === 403) {
      setServerErrorMessage('Accès refusé.');
      setStopPolling(true);
    }
  }, [query.error]);

  useEffect(() => {
    if (!proofId || !query.data) return;
    if (!pollingProfiles.proofReview.shouldContinue(query.data)) {
      setStopPolling(true);
      if (!refreshedSummaryRef.current) {
        refreshedSummaryRef.current = true;
        queryClient.invalidateQueries({
          queryKey: queryKeys.escrows.summary(escrowId, 'sender')
        });
      }
    }
  }, [proofId, escrowId, query.data, queryClient]);

  useEffect(() => {
    if (!proofId || !query.error || conflictRefetched) return;
    const status = normalizeApiError(query.error).status;
    if (status === 409) {
      setConflictRefetched(true);
      setStopPolling(true);
      query.refetch();
      if (!refreshedSummaryRef.current) {
        refreshedSummaryRef.current = true;
        queryClient.invalidateQueries({
          queryKey: queryKeys.escrows.summary(escrowId, 'sender')
        });
      }
    }
  }, [proofId, escrowId, query, query.error, conflictRefetched, queryClient]);

  const polling: ProofReviewPollingState = {
    active:
      Boolean(proofId) &&
      !stopPolling &&
      !serverErrorMessage &&
      (query.data ? pollingProfiles.proofReview.shouldContinue(query.data) : true),
    errorMessage: serverErrorMessage
  };

  return { ...query, polling };
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
          status: 'PENDING',
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
      queryClient.setQueryData(queryKeys.proofs.byId(data.id), data);
      invalidateProofBundle(queryClient, {
        proofId: data.id,
        escrowId: data.escrow_id,
        milestoneId: data.milestone_id,
        viewer: 'sender'
      });
    },
    onError: (error) => {
      throw new Error(extractErrorMessage(error));
    }
  });
}

type RequestAdvisorReviewPayload = {
  proofId: string;
  escrowId: string;
};

export function useRequestAdvisorReview() {
  const queryClient = useQueryClient();
  return useMutation<unknown, Error, RequestAdvisorReviewPayload>({
    mutationFn: async ({ proofId }) => {
      if (isDemoMode()) {
        return new Promise((resolve) => {
          setTimeout(() => resolve({}), 200);
        });
      }
      const response = await apiClient.post(`/proofs/${proofId}/request_advisor_review`, {});
      return response.data;
    },
    retry: false,
    onSettled: (_data, _error, variables) => {
      if (!variables) return;
      invalidateProofBundle(queryClient, {
        proofId: variables.proofId,
        escrowId: variables.escrowId,
        viewer: 'sender'
      });
    }
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      resetSession(queryClient, { redirectTo: '/login' });
    }
  });
}
