'use client';

// Admin view of a single escrow, showing milestones, proofs, and payments.
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { Route } from 'next';
import { extractErrorMessage } from '@/lib/apiClient';
import { normalizeApiError } from '@/lib/apiError';
import { useAdminEscrowSummary, useCreateMilestone } from '@/lib/queries/admin';
import { useEscrowMilestones, useAuthMe, useRequestAdvisorReview } from '@/lib/queries/sender';
import { ProofAiStatus } from '@/components/sender/ProofAiStatus';
import { formatDateTime } from '@/lib/format';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { Badge } from '@/components/ui/Badge';
import {
  mapAiRiskToBadge,
  mapEscrowStatusToBadge,
  mapMilestoneStatusToBadge,
  mapPaymentStatusToBadge,
  mapProofStatusToBadge
} from '@/lib/uiMappings';
import axios from 'axios';
import { Button } from '@/components/ui/Button';
import { invalidateEscrowSummary } from '@/lib/queryInvalidation';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/ToastProvider';
import {
  canRequestAdvisorReview,
  shouldStopAdvisorReviewPolling
} from '@/lib/proofAdvisorReview';
import type { NormalizedAuthUser } from '@/lib/authIdentity';
import type { MilestoneCreatePayload, MilestoneProofRequirements } from '@/types/api';
import type { UIId } from '@/types/id';

export default function AdminEscrowDetailPage() {
  const params = useParams<{ id: string }>();
  const escrowId = params?.id ?? '';
  const query = useAdminEscrowSummary(escrowId);
  const milestonesQuery = useEscrowMilestones(escrowId);
  const createMilestone = useCreateMilestone(escrowId);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const authMeQuery = useAuthMe();
  const authUser = authMeQuery.data as NormalizedAuthUser | undefined;
  const requestAdvisorReview = useRequestAdvisorReview();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [payloadJson, setPayloadJson] = useState('{\n\n}');
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [proofRequestMessage, setProofRequestMessage] = useState<{
    tone: 'success' | 'info' | 'error';
    text: string;
  } | null>(null);
  const [proofRequestPendingId, setProofRequestPendingId] = useState<UIId | null>(null);
  const [locallyRequestedProofIds, setLocallyRequestedProofIds] = useState<Set<UIId>>(
    new Set()
  );
  const locallyRequestedProofIdsRef = useRef(locallyRequestedProofIds);
  const advisorPollingRef = useRef<{
    intervalId: ReturnType<typeof setInterval> | null;
    timeoutId: ReturnType<typeof setTimeout> | null;
    targetProofId: UIId | null;
  }>({
    intervalId: null,
    timeoutId: null,
    targetProofId: null
  });
  const polling = query.polling;
  const banners = useMemo(
    () =>
      [
        polling?.fundingActive ? 'Traitement PSP' : null,
        polling?.milestoneActive ? 'Mise à jour en cours' : null,
        polling?.payoutActive ? 'Traitement payout' : null
      ].filter((label): label is string => Boolean(label)),
    [polling?.fundingActive, polling?.milestoneActive, polling?.payoutActive]
  );
  const effectiveScopes = Array.isArray(authUser?.effectiveScopes)
    ? authUser.effectiveScopes
    : [];
  const canRequestAdvisorAction =
    authUser?.globalRole === 'support' ||
    authUser?.globalRole === 'admin' ||
    effectiveScopes.includes('SUPPORT') ||
    effectiveScopes.includes('ADMIN');

  const stopAdvisorReviewPolling = useCallback(() => {
    const { intervalId, timeoutId } = advisorPollingRef.current;
    if (intervalId) clearInterval(intervalId);
    if (timeoutId) clearTimeout(timeoutId);
    advisorPollingRef.current = {
      intervalId: null,
      timeoutId: null,
      targetProofId: null
    };
  }, []);

  const startAdvisorReviewPolling = useCallback(
    (targetProofId: string) => {
      stopAdvisorReviewPolling();
      advisorPollingRef.current.targetProofId = targetProofId;

      const runRefetch = async () => {
        const result = await query.refetch();
        const proof = result.data?.proofs?.find(
          (entry) => String(entry.id) === String(targetProofId)
        );
        if (shouldStopAdvisorReviewPolling(proof, locallyRequestedProofIdsRef.current)) {
          stopAdvisorReviewPolling();
        }
      };

      void runRefetch();
      advisorPollingRef.current.intervalId = setInterval(runRefetch, 10_000);
      advisorPollingRef.current.timeoutId = setTimeout(stopAdvisorReviewPolling, 60_000);
    },
    [query, stopAdvisorReviewPolling]
  );

  useEffect(() => {
    locallyRequestedProofIdsRef.current = locallyRequestedProofIds;
  }, [locallyRequestedProofIds]);

  useEffect(() => {
    return () => {
      stopAdvisorReviewPolling();
    };
  }, [stopAdvisorReviewPolling]);

  useEffect(() => {
    const targetId = advisorPollingRef.current.targetProofId;
    if (!targetId) return;
    const proof = query.data?.proofs?.find((entry) => String(entry.id) === String(targetId));
    if (shouldStopAdvisorReviewPolling(proof, locallyRequestedProofIdsRef.current)) {
      stopAdvisorReviewPolling();
    }
  }, [query.data, stopAdvisorReviewPolling]);

  if (query.isLoading) {
    return <LoadingState label="Chargement du détail escrow..." />;
  }

  if (query.isError) {
    const status = axios.isAxiosError(query.error) ? query.error.response?.status : null;
    const scopeMessage = (() => {
      if (status === 403) {
        return 'Accès refusé : votre compte ne dispose pas du scope requis pour consulter ce résumé.';
      }
      if (status === 404 || status === 410) {
        return 'Ressource indisponible : cet escrow est introuvable ou archivé.';
      }
      return null;
    })();
    return (
      <div className="p-4">
        <ErrorAlert message={scopeMessage ?? extractErrorMessage(query.error)} />
      </div>
    );
  }

  const data = query.data;
  const escrow = data?.escrow;
  const milestones = data?.milestones ?? [];
  const fullMilestones = milestonesQuery.data ?? [];
  const proofs = data?.proofs ?? [];
  const payments = data?.payments ?? [];
  const formatOptionalDate = (value?: string | Date | null) =>
    value ? formatDateTime(value) : '—';
  const lastUpdatedAt = query.dataUpdatedAt ? new Date(query.dataUpdatedAt) : null;
  const listUpdatedAt = milestonesQuery.dataUpdatedAt ? new Date(milestonesQuery.dataUpdatedAt) : null;
  const refreshSummary = () => invalidateEscrowSummary(queryClient, escrowId);
  const refreshMilestones = () => milestonesQuery.refetch();
  const paymentDetailPath = (paymentId: UIId) =>
    ['', 'admin', 'payments', paymentId].join('/') as Route;

  const handleRequestAdvisorReview = async (proofId: UIId) => {
    if (!canRequestAdvisorAction) return;
    setProofRequestMessage(null);
    setProofRequestPendingId(proofId);
    try {
      await requestAdvisorReview.mutateAsync({ proofId, escrowId, viewer: 'admin' });
      setLocallyRequestedProofIds((prev) => {
        const next = new Set(prev);
        next.add(proofId);
        return next;
      });
      const successMessage = 'Demande de revue conseiller envoyée.';
      setProofRequestMessage({ tone: 'success', text: successMessage });
      showToast(successMessage, 'success');
      await query.refetch();
      startAdvisorReviewPolling(proofId);
    } catch (error) {
      const normalized = normalizeApiError(error);
      const message = (() => {
        if (normalized.status === 409) {
          return 'Revue conseiller déjà demandée.';
        }
        if (normalized.status === 403) {
          return "Accès refusé : vous ne pouvez pas demander cette revue.";
        }
        if (normalized.status === 404) {
          return 'Preuve introuvable.';
        }
        if (normalized.status === 401) {
          return 'Session expirée. Merci de vous reconnecter.';
        }
        if (normalized.status === 422) {
          return normalized.message ?? extractErrorMessage(error);
        }
        return normalized.message ?? extractErrorMessage(error);
      })();
      setProofRequestMessage({
        tone: normalized.status === 409 ? 'info' : 'error',
        text: message
      });
      showToast(message, normalized.status === 409 ? 'info' : 'error');
    } finally {
      setProofRequestPendingId(null);
    }
  };

  const handleCreateMilestone = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);

    let payload: unknown;
    try {
      payload = JSON.parse(payloadJson);
    } catch (_error) {
      setCreateError('Le payload doit être un JSON valide.');
      return;
    }

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      setCreateError('Le payload doit être un objet JSON.');
      return;
    }

    const {
      label,
      amount,
      currency,
      sequence_index,
      proof_kind,
      proof_requirements
    } = payload as Record<string, unknown>;

    if (
      typeof label !== 'string' ||
      typeof amount !== 'string' ||
      typeof currency !== 'string' ||
      typeof sequence_index !== 'number'
    ) {
      setCreateError(
        'Le payload doit inclure label, amount, currency et sequence_index aux formats attendus.'
      );
      return;
    }

    const proofRequirements =
      proof_requirements && typeof proof_requirements === 'object' && !Array.isArray(proof_requirements)
        ? (proof_requirements as MilestoneProofRequirements)
        : undefined;
    const typedPayload: MilestoneCreatePayload = {
      label,
      amount,
      currency,
      sequence_index,
      proof_kind: typeof proof_kind === 'string' ? proof_kind : undefined,
      proof_requirements: proofRequirements
    };

    try {
      await createMilestone.mutateAsync(typedPayload);
      setCreateSuccess('Milestone created');
      showToast('Milestone created', 'success');
      setShowCreateForm(false);
      setPayloadJson('{\n\n}');
    } catch (error) {
      const normalized = normalizeApiError(error);
      if (normalized.status === 409) {
        setCreateError('Conflit : ce jalon est déjà créé ou l’escrow a avancé.');
      } else if (normalized.status === 422) {
        setCreateError(extractErrorMessage(error));
      } else if (normalized.status === 403) {
        setCreateError("Accès refusé : vous n'avez pas les droits pour créer un jalon.");
      } else if (normalized.status === 404) {
        setCreateError("Ressource introuvable : l'escrow n'existe pas.");
      } else {
        setCreateError(extractErrorMessage(error));
      }
      showToast(extractErrorMessage(error), 'error');
    }
  };

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      {banners.map((label) => (
        <div key={label} className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          {label}
        </div>
      ))}
      {polling?.timedOut && (
        <div className="flex flex-col gap-2 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between">
          <span>La mise à jour automatique a été suspendue. Rafraîchissez pour obtenir le dernier statut.</span>
          <Button variant="outline" onClick={refreshSummary}>
            Refresh
          </Button>
        </div>
      )}
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Escrow {escrow?.id ?? '—'}</h2>
            <div className="mt-1 flex items-center gap-2 text-sm text-slate-600">
              <span>Statut :</span>
              {(() => {
                if (!escrow?.status) {
                  return <Badge variant="neutral">—</Badge>;
                }
                const badge = mapEscrowStatusToBadge(escrow.status);
                return <Badge variant={badge.variant}>{badge.label}</Badge>;
              })()}
            </div>
          </div>
          <div className="text-right text-sm text-slate-500">
            <p>Créé le {formatOptionalDate(escrow?.created_at)}</p>
            {lastUpdatedAt && <p>Last updated : {formatOptionalDate(lastUpdatedAt)}</p>}
          </div>
        </div>
        <p className="mt-2 text-slate-700">
          Montant : {escrow?.amount ?? '—'} {escrow?.currency ?? ''}
        </p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-2 text-lg font-semibold">Conseiller assigné</h3>
        <p className="text-sm text-muted-foreground">
          Ce conseiller accompagne cet escrow pour les revues et la conformité.
        </p>
        {data.advisor ? (
          <div className="mt-3 flex flex-col gap-2 text-sm text-slate-700 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold">
                {data.advisor?.first_name ?? '—'} {data.advisor?.last_name ?? ''}
              </p>
              <p className="text-xs text-slate-500">{data.advisor?.email ?? '—'}</p>
            </div>
            <Badge variant="neutral">Conseiller assigné</Badge>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-600">Aucun conseiller assigné.</p>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-3 text-lg font-semibold">Jalons</h3>
        <div className="space-y-2">
          {milestones.map((milestone) => (
            <div key={milestone.id} className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2">
              <div>
                <p className="font-medium">{milestone.name ?? '—'}</p>
                <p className="text-xs text-slate-500">Échéance : {milestone.due_date ?? '—'}</p>
              </div>
              {(() => {
                if (!milestone.status) {
                  return <Badge variant="neutral">—</Badge>;
                }
                const badge = mapMilestoneStatusToBadge(milestone.status);
                return <Badge variant={badge.variant}>{badge.label}</Badge>;
              })()}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Jalons (liste complète)</h3>
            {listUpdatedAt && (
              <p className="text-xs text-slate-500">Dernière mise à jour : {formatOptionalDate(listUpdatedAt)}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={refreshMilestones} disabled={milestonesQuery.isFetching}>
              Rafraîchir la liste
            </Button>
            <Button size="sm" onClick={() => setShowCreateForm((prev) => !prev)}>
              {showCreateForm ? 'Fermer' : 'Add milestone'}
            </Button>
          </div>
        </div>

        {createSuccess && (
          <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {createSuccess}
          </div>
        )}
        {createError && (
          <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
            {createError}
          </div>
        )}

        {showCreateForm && (
          <form onSubmit={handleCreateMilestone} className="mt-4 space-y-3 rounded-md border border-slate-100 bg-slate-50 p-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Payload JSON (admin)</label>
              <p className="text-xs text-slate-500">
                Renseignez le JSON exact attendu par l&apos;API de création de jalon.
              </p>
              <textarea
                className="mt-2 w-full rounded-md border border-slate-300 p-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                rows={6}
                value={payloadJson}
                onChange={(event) => setPayloadJson(event.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" disabled={createMilestone.isPending}>
                {createMilestone.isPending ? 'Création...' : 'Créer le jalon'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)} disabled={createMilestone.isPending}>
                Annuler
              </Button>
            </div>
          </form>
        )}

        <div className="mt-4 space-y-2">
          {milestonesQuery.isLoading && <p className="text-sm text-slate-600">Chargement des jalons...</p>}
          {milestonesQuery.isError && (
            <ErrorAlert message={extractErrorMessage(milestonesQuery.error)} />
          )}
          {!milestonesQuery.isLoading && !milestonesQuery.isError && fullMilestones.length === 0 && (
            <p className="text-sm text-slate-600">Aucun jalon enregistré.</p>
          )}
          {fullMilestones.map((milestone) => (
            <div key={milestone.id} className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2">
              <div>
                <p className="font-medium">{milestone.name ?? '—'}</p>
                <p className="text-xs text-slate-500">Échéance : {milestone.due_date ?? '—'}</p>
              </div>
              {(() => {
                if (!milestone.status) {
                  return <Badge variant="neutral">—</Badge>;
                }
                const badge = mapMilestoneStatusToBadge(milestone.status);
                return <Badge variant={badge.variant}>{badge.label}</Badge>;
              })()}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-3 text-lg font-semibold">Preuves</h3>
        <div className="space-y-3">
          {proofRequestMessage && (
            <div
              className={
                proofRequestMessage.tone === 'success'
                  ? 'rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800'
                  : proofRequestMessage.tone === 'info'
                    ? 'rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900'
                    : 'rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700'
              }
            >
              {proofRequestMessage.text}
            </div>
          )}
          {proofs.length === 0 && <p className="text-slate-600">Aucune preuve enregistrée.</p>}
          {proofs.map((proof) => (
            <div key={proof.id} className="rounded-md border border-slate-100 p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium">{proof.description ?? 'Preuve fournie'}</p>
                <div className="flex items-center gap-2">
                  {(() => {
                    if (!proof.status) {
                      return <Badge variant="neutral">—</Badge>;
                    }
                    const badge = mapProofStatusToBadge(proof.status);
                    return <Badge variant={badge.variant}>{badge.label}</Badge>;
                  })()}
                  {proof.ai_checked_at &&
                    (() => {
                      const aiBadge = mapAiRiskToBadge(proof.ai_risk_level);
                      return <Badge variant={aiBadge.variant}>{aiBadge.label}</Badge>;
                    })()}
                </div>
              </div>
              <p className="text-xs text-slate-500">{formatOptionalDate(proof.created_at)}</p>
              {(() => {
                const attachmentLink =
                  proof.storage_url ?? proof.attachment_url ?? proof.file_url ?? undefined;
                if (!attachmentLink) return null;
                return (
                  <a
                    href={attachmentLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-indigo-600 hover:underline"
                  >
                    Consulter la pièce jointe
                  </a>
                );
              })()}
              <div className="mt-2 space-y-2">
                <ProofAiStatus proof={proof} />
                {canRequestAdvisorAction && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRequestAdvisorReview(proof.id)}
                      disabled={
                        proofRequestPendingId === proof.id ||
                        !canRequestAdvisorReview(proof, locallyRequestedProofIds)
                      }
                    >
                      {proofRequestPendingId === proof.id
                        ? 'Requesting...'
                        : 'Demander revue conseiller'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-3 text-lg font-semibold">Paiements</h3>
        <div className="space-y-2">
          {payments.length === 0 && <p className="text-slate-600">Aucun paiement enregistré.</p>}
          {payments.map((payment) => (
            <div key={payment.id} className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2">
              <div>
                <p className="font-medium">{payment.amount ?? '—'}</p>
                <p className="text-xs text-slate-500">{formatOptionalDate(payment.created_at)}</p>
              </div>
              <div className="flex items-center gap-3">
                {(() => {
                  if (!payment.status) {
                    return <Badge variant="neutral">—</Badge>;
                  }
                  const badge = mapPaymentStatusToBadge(payment.status);
                  return <Badge variant={badge.variant}>{badge.label}</Badge>;
                })()}
                <Link
                  href={paymentDetailPath(payment.id)}
                  className="text-sm text-indigo-600 hover:underline"
                >
                  Voir
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
