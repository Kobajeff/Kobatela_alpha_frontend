"use client";

// React Query hooks encapsulating sender-specific API calls.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Query } from '@tanstack/query-core';
import { isAxiosError } from 'axios';
import { useRouter } from 'next/navigation';
import { apiClient, extractErrorMessage, isUnauthorizedError } from '../apiClient';
import { isNoAdvisorAvailable } from '../errors';
import { clearAuthToken, setAuthToken } from '../auth';
import { getDemoRole, isDemoMode } from '@/lib/config';
import { afterProofUpload } from '@/lib/queryInvalidation';
import { makeRefetchInterval, pollingProfiles } from '@/lib/pollingDoctrine';
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
  EscrowListItem,
  AuthLoginResponse,
  AuthUser,
  Payment,
  Proof,
  ProofStatus,
  AdvisorProfile,
  SenderDashboard,
  SenderEscrowSummary,
  AuthMeResponse
} from '@/types/api';
import {
  buildQueryString,
  createQueryKey,
  normalizePaginatedItems
} from './queryUtils';
import { getEscrowSummaryPollingFlags } from './escrowSummaryPolling';

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
      queryClient.invalidateQueries({ queryKey: ['authMe'] });
    },
    onError: (error) => {
      throw new Error(extractErrorMessage(error));
    }
  });
}

export function useMyAdvisor() {
  return useQuery<AdvisorProfile | null>({
    queryKey: ['myAdvisor'],
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
    queryKey: ['authMe'],
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

  useEffect(() => {
    if (query.error && isUnauthorizedError(query.error)) {
      clearAuthToken();
      queryClient.clear();
    }
  }, [query.error, queryClient]);

  return query;
}

export function useMyProfile() {
  return useAuthMe();
}

export function useSenderDashboard() {
  return useQuery<SenderDashboard>({
    queryKey: createQueryKey('senderDashboard', { scope: 'canonical' }),
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
  return useQuery<EscrowListItem[]>({
    queryKey: ['senderEscrows', { status, limit, offset }],
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
    queryKey: ['escrowSummary', escrowId],
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
      afterProofUpload(queryClient, data.escrow_id);
    },
    onError: (error) => {
      throw new Error(extractErrorMessage(error));
    }
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: async () => {
      clearAuthToken();
    },
    onSuccess: () => {
      queryClient.clear();
      router.replace('/login');
    }
  });
}
