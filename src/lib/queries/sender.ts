"use client";

// React Query hooks encapsulating sender-specific API calls.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import type { Route } from 'next';
import type { Query } from '@tanstack/query-core';
import { isAxiosError } from 'axios';
import { usePathname, useRouter } from 'next/navigation';
import { apiClient, extractErrorMessage } from '../apiClient';
import { normalizeApiError } from '../apiError';
import { isNoAdvisorAvailable } from '../errors';
import { getAuthToken, getAuthTokenEventName, setAuthToken, setAuthUser } from '../auth';
import { resetSession } from '../sessionReset';
import { getDemoRole, isDemoMode } from '@/lib/config';
import { invalidateEscrowBundle, invalidateProofBundle } from '@/lib/invalidation';
import { makeRefetchInterval, pollingProfiles } from '@/lib/pollingDoctrine';
import { queryKeys, type EscrowSummaryViewer } from '@/lib/queryKeys';
import {
  demoEscrows,
  demoAdvisorProfile,
  demoPayments,
  demoProofs,
  demoUserProfile,
  getDemoEscrowSummary,
  getDemoUserByRole
} from '@/lib/demoData';
import { getPortalDestination, normalizeAuthUser, type NormalizedAuthUser } from '../authIdentity';
import type {
  CreateProofPayload,
  EscrowCreatePayload,
  EscrowListItem,
  EscrowRead,
  AuthLoginResponse,
  MilestoneCreatePayload,
  Milestone,
  MilestoneStatus,
  Payment,
  Proof,
  ProofDecisionRequest,
  ProofDecisionResponse,
  AdvisorProfile,
  SenderDashboard,
  SenderEscrowSummary,
  FundingSessionRead,
  MerchantSuggestion,
  MerchantSuggestionCreatePayload,
  UsageMandateCreate,
  UsageMandateRead,
  UserProfile,
  UserProfileUpdatePayload
} from '@/types/api';
import type { AuthMeResponse } from '@/types/auth';
import type {
  EscrowListItemUI,
  EscrowReadUI,
  MilestoneUI,
  ProofUI,
  SenderDashboardUI,
  SenderEscrowSummaryUI
} from '@/types/ui';
import {
  normalizeEscrowListItem,
  normalizeEscrowRead,
  normalizeMilestone,
  normalizeProof,
  normalizeSenderDashboard,
  normalizeSenderEscrowSummary
} from '@/lib/normalize';
import type { UIId } from '@/types/id';
import { getEscrowSummaryPollingFlags } from './escrowSummaryPolling';

const ACTIVE_MILESTONE_STATUSES = new Set<MilestoneStatus>(['PENDING_REVIEW', 'PAYING']);

export function useMerchantSuggestionsList() {
  return useQuery<MerchantSuggestion[]>({
    queryKey: queryKeys.sender.merchantSuggestions.listBase(),
    queryFn: async () => {
      if (isDemoMode()) {
        return [];
      }
      const response = await apiClient.get<MerchantSuggestion[]>(`/merchant-suggestions`);
      return response.data;
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

export function useCreateMandate() {
  const queryClient = useQueryClient();
  return useMutation<UsageMandateRead, Error, UsageMandateCreate>({
    mutationFn: async (payload) => {
      const response = await apiClient.post<UsageMandateRead>('/mandates', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sender.mandates.base() });
    }
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
  return useMutation<AuthLoginResponse, Error, { email: string; scope?: string }>({
    mutationFn: async ({ email, scope }) => {
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

      const response = await apiClient.post<AuthLoginResponse>('/auth/login', {
        email,
        ...(scope ? { scope } : {})
      });
      const data = response.data;
      const token = data.token ?? data.access_token;
      if (token) {
        setAuthToken(token);
      }
      const meResponse = await apiClient.get<AuthMeResponse>('/auth/me');
      return { ...data, user: meResponse.data.user };
    },
    onSuccess: (data) => {
      const token = data.token ?? data.access_token;
      if (token) {
        setAuthToken(token);
      }
      const normalizedUser = normalizeAuthUser(data.user);
      setAuthUser(data.user);
      queryClient.setQueryData(queryKeys.auth.me(), normalizedUser);
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

export function useAuthMe(): UseQueryResult<NormalizedAuthUser, Error> {
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    if (isDemoMode()) {
      setHasToken(true);
      return;
    }

    const updateTokenState = () => {
      setHasToken(Boolean(getAuthToken()));
    };

    updateTokenState();

    const tokenEventName = getAuthTokenEventName();
    window.addEventListener(tokenEventName, updateTokenState);
    window.addEventListener('storage', updateTokenState);
    return () => {
      window.removeEventListener(tokenEventName, updateTokenState);
      window.removeEventListener('storage', updateTokenState);
    };
  }, []);

  const enabled = isDemoMode() || hasToken;
  const query = useQuery<NormalizedAuthUser, Error>({
    queryKey: queryKeys.auth.me(),
    queryFn: async () => {
      if (isDemoMode()) {
        const role = getDemoRole();
        const user = getDemoUserByRole(role);
        return new Promise((resolve) => {
          setTimeout(() => resolve(normalizeAuthUser(user)), 200);
        });
      }
      const response = await apiClient.get<AuthMeResponse>('/auth/me');
      return normalizeAuthUser(response.data.user);
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      const status = normalizeApiError(error).status;
      if (status === 401 || status === 403) return false;
      return failureCount < 1;
    },
    enabled
  });

  useEffect(() => {
    if (query.data) {
      setAuthUser(query.data);
    }
  }, [query.data]);

  return query;
}

export function useMyProfile() {
  return useUserProfile();
}

export function useUserProfile() {
  return useQuery<UserProfile>({
    queryKey: queryKeys.sender.profile(),
    queryFn: async () => {
      if (isDemoMode()) {
        return new Promise((resolve) => {
          setTimeout(() => resolve(demoUserProfile), 200);
        });
      }
      const response = await apiClient.get<UserProfile>('/me/profile');
      return response.data;
    }
  });
}

export function useUpdateUserProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UserProfileUpdatePayload) => {
      const response = await apiClient.patch<UserProfile>('/me/profile', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sender.profile() });
    },
    onError: (error) => {
      throw new Error(extractErrorMessage(error));
    }
  });
}

export function useSenderDashboard(params: { limit?: number; includeActions?: boolean } = {}) {
  const { limit = 5, includeActions = false } = params;
  return useQuery<SenderDashboardUI>({
    queryKey: queryKeys.sender.dashboard(),
    queryFn: async () => {
      if (isDemoMode()) {
        const recentEscrows = demoEscrows.slice(0, limit);
        const pendingProofs = demoProofs.filter((p) => p.status === 'PENDING').slice(0, limit);
        const recentPayments = demoPayments.slice(0, limit);

        return new Promise<SenderDashboardUI>((resolve) => {
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

      const searchParams = new URLSearchParams({
        limit: String(limit)
      });
      if (includeActions) {
        searchParams.set('include_actions', 'true');
      }

      // Contract: docs/Backend_info/API_GUIDE (11).md — Sender dashboard payload — GET /sender/dashboard — sender
      const response = await apiClient.get<SenderDashboard>(`/sender/dashboard?${searchParams.toString()}`);
      return normalizeSenderDashboard(response.data);
    }
  });
}

export function useSenderEscrows(params: { status?: string; limit?: number; offset?: number } = {}) {
  const { status, limit = 20, offset = 0 } = params;
  const filters = useMemo(
    () => ({ status, limit, offset, mine: true }),
    [limit, offset, status]
  );
  return useQuery<EscrowListItemUI[]>({
    queryKey: queryKeys.escrows.list(filters),
    queryFn: async () => {
      if (isDemoMode()) {
        let items = demoEscrows;
        if (status) {
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
      return response.data.map(normalizeEscrowListItem);
    }
  });
}

export function useCreateEscrow() {
  const queryClient = useQueryClient();
  return useMutation<EscrowReadUI, Error, EscrowCreatePayload>({
    mutationFn: async (payload) => {
      if (isDemoMode()) {
        const now = new Date().toISOString();
        return new Promise<EscrowReadUI>((resolve) => {
          const draft: EscrowRead = {
            id: `demo-escrow-${Date.now()}`,
            client_id: '1',
            provider_user_id: undefined,
            provider_id: undefined,
            beneficiary_id: undefined,
            beneficiary_profile: null,
            amount_total: payload.amount_total,
            currency: payload.currency,
            status: 'DRAFT',
            domain: payload.domain ?? 'private',
            payment_mode: payload.payment_mode ?? 'MILESTONE',
            release_conditions_json: payload.release_conditions ?? {},
            deadline_at: payload.deadline_at ?? now,
            created_at: now
          };
          setTimeout(() => resolve(normalizeEscrowRead(draft)), 200);
        });
      }
      const response = await apiClient.post<EscrowRead>('/escrows', payload);
      return normalizeEscrowRead(response.data);
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

export function useCreateEscrowMilestones() {
  const queryClient = useQueryClient();
  return useMutation<Milestone[], Error, { escrowId: UIId; milestones: MilestoneCreatePayload[] }>({
    mutationFn: async ({ escrowId, milestones }) => {
      if (milestones.length === 0) return [];
      const created: Milestone[] = [];
      for (const milestone of milestones) {
        const response = await apiClient.post<Milestone>(`/escrows/${escrowId}/milestones`, {
          // Contract: docs/Backend_info/API_GUIDE (7).md — MilestoneCreate — label
          label: milestone.label,
          // Contract: docs/Backend_info/API_GUIDE (7).md — MilestoneCreate — amount
          amount: milestone.amount,
          // Contract: docs/Backend_info/API_GUIDE (7).md — MilestoneCreate — currency
          currency: milestone.currency,
          // Contract: docs/Backend_info/API_GUIDE (7).md — MilestoneCreate — sequence_index
          sequence_index: milestone.sequence_index,
          // Contract: docs/Backend_info/API_GUIDE (7).md — MilestoneCreate — proof_kind
          proof_kind: milestone.proof_kind,
          // Contract: docs/Backend_info/API_GUIDE (7).md — MilestoneCreate — proof_requirements
          proof_requirements: milestone.proof_requirements
        });
        created.push(response.data);
      }
      return created;
    },
    onSuccess: (_data, variables) => {
      invalidateEscrowBundle(queryClient, {
        escrowId: variables.escrowId,
        viewer: 'sender',
        refetchSummary: true
      });
    },
    onError: (error) => {
      throw new Error(extractErrorMessage(error));
    }
  });
}

export function useMandate(mandateId?: string) {
  return useQuery<UsageMandateRead>({
    queryKey: queryKeys.sender.mandates.byId(mandateId),
    queryFn: async () => {
      if (!mandateId) throw new Error('Mandate id is required');
      const response = await apiClient.get<UsageMandateRead>(`/mandates/${mandateId}`);
      return response.data;
    },
    enabled: Boolean(mandateId)
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
  escrowId: UIId,
  options?: { fundingInProgress?: boolean; viewer?: EscrowSummaryViewer }
) {
  const viewer = options?.viewer ?? 'sender';
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
    (query: Query<SenderEscrowSummaryUI>) => {
      if (!escrowId || pollingBlockedRef.current) return false;

      const summary = query.state.data as SenderEscrowSummaryUI | undefined;
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

  const query = useQuery<SenderEscrowSummaryUI>({
    queryKey: queryKeys.escrows.summary(escrowId, viewer),
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
      return normalizeSenderEscrowSummary(response.data);
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

async function listEscrowMilestones(escrowId: UIId): Promise<MilestoneUI[]> {
  if (isDemoMode()) {
    const summary = getDemoEscrowSummary(escrowId);
    return new Promise<MilestoneUI[]>((resolve, reject) => {
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
  return response.data.map(normalizeMilestone);
}

async function getMilestone(milestoneId: UIId): Promise<MilestoneUI> {
  if (isDemoMode()) {
    const milestone = demoEscrows
      .map((escrow) => getDemoEscrowSummary(String(escrow.id)))
      .flatMap((summary) => summary?.milestones ?? [])
      .find((entry) => entry.id === milestoneId);
    return new Promise<MilestoneUI>((resolve, reject) => {
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
  return normalizeMilestone(response.data);
}

function isMilestoneInProgress(status?: MilestoneStatus | null) {
  if (!status) return false;
  return ACTIVE_MILESTONE_STATUSES.has(String(status).toUpperCase() as MilestoneStatus);
}

export function useEscrowMilestones(escrowId: UIId) {
  const startTimeRef = useRef<number | null>(null);
  const refetchHandledRef = useRef(false);
  const query = useQuery<MilestoneUI[]>({
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

export function useMilestoneDetail(milestoneId: UIId) {
  const refetchHandledRef = useRef(false);
  const query = useQuery<MilestoneUI>({
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
  escrowId: UIId,
  path: string,
  payload?: Record<string, unknown>
) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      if (isDemoMode()) {
        return new Promise<void>((resolve) => {
          setTimeout(() => resolve(), 200);
        });
      }
      await apiClient.post(`/escrows/${escrowId}/${path}`, payload);
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

export function useMarkDelivered(escrowId: UIId) {
  return useEscrowAction(escrowId, 'mark-delivered', {});
}

export function useClientApprove(escrowId: UIId) {
  return useEscrowAction(escrowId, 'client-approve', {});
}

export function useClientReject(escrowId: UIId) {
  return useEscrowAction(escrowId, 'client-reject', {});
}

export function useCheckDeadline(escrowId: UIId) {
  return useEscrowAction(escrowId, 'check-deadline');
}

export function useActivateEscrow(escrowId: UIId) {
  const queryClient = useQueryClient();
  return useMutation<EscrowReadUI, Error, { note?: string | null } | void>({
    mutationFn: async (payload) => {
      if (isDemoMode()) {
        const demoSummary = getDemoEscrowSummary(escrowId);
        return new Promise((resolve) => {
          setTimeout(() => resolve(demoSummary?.escrow ?? ({} as EscrowReadUI)), 200);
        });
      }
      const response = await apiClient.post<EscrowRead>(
        `/escrows/${escrowId}/activate`,
        payload ?? {}
      );
      return normalizeEscrowRead(response.data);
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

export function useCreateFundingSession(escrowId: UIId) {
  const queryClient = useQueryClient();
  return useMutation<FundingSessionRead, Error, void>({
    mutationFn: async () => {
      if (isDemoMode()) {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ funding_id: 0, client_secret: '' }), 200);
        });
      }
      const response = await apiClient.post<FundingSessionRead>(
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

type DepositPayload = {
  idempotencyKey: string;
  amount: string;
};

export function useDepositEscrow(escrowId: UIId) {
  const queryClient = useQueryClient();
  return useMutation<EscrowReadUI, Error, DepositPayload>({
    mutationFn: async ({ idempotencyKey, amount }) => {
      if (isDemoMode()) {
        const demoSummary = getDemoEscrowSummary(escrowId);
        return new Promise((resolve) => {
          setTimeout(() => resolve(demoSummary?.escrow ?? ({} as EscrowReadUI)), 200);
        });
      }
      const response = await apiClient.post<EscrowRead>(
        `/escrows/${escrowId}/deposit`,
        { amount },
        {
          headers: {
            'Idempotency-Key': idempotencyKey
          }
        }
      );
      return normalizeEscrowRead(response.data);
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
};

async function fetchProofById({ proofId }: ProofLookupParams): Promise<ProofUI> {
  const response = await apiClient.get<Proof>(`/proofs/${proofId}`);
  return normalizeProof(response.data);
}

export function useProofDetail(proofId?: string) {
  return useQuery<ProofUI, Error>({
    queryKey: queryKeys.proofs.byId(proofId ?? null),
    queryFn: async () => {
      if (!proofId) {
        throw new Error('Proof id is required');
      }
      if (isDemoMode()) {
        const demoProof = demoProofs.find((proof) => String(proof.id) === String(proofId));
        if (!demoProof) {
          throw new Error('Proof not found in demo data');
        }
        return new Promise((resolve) => {
          setTimeout(() => resolve(demoProof), 200);
        });
      }
      return fetchProofById({ proofId });
    },
    enabled: Boolean(proofId)
  });
}

export function useProofReviewPolling(
  proofId: UIId | null,
  escrowId: UIId,
  viewer: EscrowSummaryViewer = 'sender'
) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const { data: authUser } = useAuthMe();
  const [stopPolling, setStopPolling] = useState(false);
  const [serverErrorMessage, setServerErrorMessage] = useState<string | null>(null);
  const [conflictRefetched, setConflictRefetched] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const refreshedSummaryRef = useRef(false);
  const demoFetchCountRef = useRef(0);
  const [isTabVisible, setIsTabVisible] = useState(
    typeof document === 'undefined' ? true : document.visibilityState === 'visible'
  );

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
    const handleVisibility = () => {
      setIsTabVisible(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    if (!proofId || stopPolling) return undefined;
    const timeoutId = setTimeout(() => {
      setStopPolling(true);
    }, pollingProfiles.proofReview.maxDurationMs);
    return () => clearTimeout(timeoutId);
  }, [proofId, stopPolling]);

  const query = useQuery<ProofUI, Error>({
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
          type: 'DOCUMENT',
          storage_key: 'proofs/demo-proof.pdf',
          storage_url: 'https://demo.kobatela.com/files/demo-proof.pdf',
          sha256: 'demo-sha',
          file_id: 'demo-file-id',
          status,
          created_at: new Date().toISOString(),
          ai_risk_level: null,
          ai_score: null,
          ai_explanation: null,
          ai_checked_at: null
        };
      }
      return fetchProofById({ proofId });
    },
    enabled: Boolean(proofId) && !stopPolling,
    refetchInterval: (queryInstance) => {
      if (!proofId || stopPolling || !isTabVisible) return false;
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
      setServerErrorMessage('Accès refusé : portée insuffisante.');
      setStopPolling(true);
      const destination = getPortalDestination(authUser ?? null);
      if (destination?.path && pathname && !pathname.startsWith(destination.path)) {
        router.replace(destination.path as Route);
      }
    }
  }, [authUser, pathname, query.error, router]);

  useEffect(() => {
    if (!proofId || !query.data) return;
    if (!pollingProfiles.proofReview.shouldContinue(query.data)) {
      setStopPolling(true);
      if (!refreshedSummaryRef.current) {
        refreshedSummaryRef.current = true;
        queryClient.invalidateQueries({
          queryKey: queryKeys.escrows.summary(escrowId, viewer)
        });
      }
    }
  }, [proofId, escrowId, query.data, queryClient, viewer]);

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
          queryKey: queryKeys.escrows.summary(escrowId, viewer)
        });
      }
    }
  }, [proofId, escrowId, query, query.error, conflictRefetched, queryClient, viewer]);

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

export function useCreateProof(options?: { viewer?: EscrowSummaryViewer }) {
  const queryClient = useQueryClient();
  const viewer = options?.viewer ?? 'sender';
  return useMutation<ProofUI, Error, CreateProofPayload>({
    mutationFn: async (payload) => {
      if (isDemoMode()) {
        const now = new Date().toISOString();
        return normalizeProof({
          id: `demo-proof-${Date.now()}`,
          escrow_id: payload.escrow_id,
          milestone_idx: payload.milestone_idx,
          type: payload.type,
          storage_key: payload.storage_key,
          storage_url: payload.storage_url,
          sha256: payload.sha256,
          metadata: payload.metadata,
          file_id: 'demo-file-id',
          status: 'PENDING',
          created_at: now,
          ai_risk_level: null,
          ai_score: null,
          ai_explanation: null,
          ai_checked_at: null
        });
      }
      const response = await apiClient.post<Proof>('/proofs', payload);
      return normalizeProof(response.data);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.proofs.byId(data.id), data);
      invalidateProofBundle(queryClient, {
        proofId: data.id,
        escrowId: data.escrow_id,
        milestoneId: data.milestone_id,
        viewer
      });
    },
    onError: (error) => {
      throw new Error(extractErrorMessage(error));
    }
  });
}

type RequestAdvisorReviewPayload = {
  proofId: UIId;
  escrowId: UIId;
  viewer?: EscrowSummaryViewer;
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
      try {
        const response = await apiClient.post(`/proofs/${proofId}/request_advisor_review`, {});
        return response.data;
      } catch (error) {
        const normalized = normalizeApiError(error);
        if (normalized.status === 401) {
          resetSession(queryClient, { redirectTo: '/login' });
        }

        const enrichedError = new Error(normalized.message ?? extractErrorMessage(error));
        (enrichedError as Error & { status?: number }).status = normalized.status;
        (enrichedError as Error & { code?: string }).code = normalized.code;
        (enrichedError as Error & { details?: unknown }).details = normalized.details;
        throw enrichedError;
      }
    },
    retry: (failureCount, error) => {
      const status = normalizeApiError(error).status;
      if (status && [401, 403, 409, 422].includes(status)) {
        return false;
      }
      return failureCount < 2;
    },
    onSettled: (_data, _error, variables) => {
      if (!variables) return;
      invalidateProofBundle(queryClient, {
        proofId: variables.proofId,
        escrowId: variables.escrowId,
        viewer: variables.viewer ?? 'sender'
      });
    }
  });
}

export function useProofDecision() {
  const queryClient = useQueryClient();
  return useMutation<
    ProofDecisionResponse,
    Error,
    { proofId: string; payload: ProofDecisionRequest; escrowId: string; viewer?: EscrowSummaryViewer }
  >({
    mutationFn: async ({ proofId, payload }) => {
      if (isDemoMode()) {
        const demoProof = demoProofs.find((proof) => String(proof.id) === String(proofId));
        const status = payload.decision === 'approve' ? 'APPROVED' : 'REJECTED';
        return new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                ...(demoProof ?? { id: proofId, escrow_id: 'demo', created_at: new Date().toISOString() }),
                status
              } as ProofDecisionResponse),
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
    onSuccess: (_data, variables) => {
      invalidateProofBundle(queryClient, {
        proofId: variables.proofId,
        escrowId: variables.escrowId,
        viewer: variables.viewer ?? 'sender'
      });
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
      resetSession(queryClient, { redirectTo: '/login' });
    }
  });
}
