'use client';

// Admin view of a single escrow, showing milestones, proofs, and payments.
import { useMemo, useState, type FormEvent } from 'react';
import { useParams } from 'next/navigation';
import { extractErrorMessage } from '@/lib/apiClient';
import { normalizeApiError } from '@/lib/apiError';
import { useAdminEscrowSummary, useCreateMilestone } from '@/lib/queries/admin';
import { useEscrowMilestones } from '@/lib/queries/sender';
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

export default function AdminEscrowDetailPage() {
  const params = useParams<{ id: string }>();
  const escrowId = params?.id ?? '';
  const query = useAdminEscrowSummary(escrowId);
  const milestonesQuery = useEscrowMilestones(escrowId);
  const createMilestone = useCreateMilestone(escrowId);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [payloadJson, setPayloadJson] = useState('{\n\n}');
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
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
  const fullMilestones = useMemo(() => milestonesQuery.data ?? [], [milestonesQuery.data]);
  const proofs = data?.proofs ?? [];
  const payments = data?.payments ?? [];
  const formatOptionalDate = (value?: string | Date | null) =>
    value ? formatDateTime(value) : '—';
  const lastUpdatedAt = query.dataUpdatedAt ? new Date(query.dataUpdatedAt) : null;
  const listUpdatedAt = milestonesQuery.dataUpdatedAt ? new Date(milestonesQuery.dataUpdatedAt) : null;
  const refreshSummary = () => invalidateEscrowSummary(queryClient, escrowId);
  const refreshMilestones = () => milestonesQuery.refetch();

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

    try {
      await createMilestone.mutateAsync(payload as Record<string, unknown>);
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
                const attachmentLink = proof.attachment_url ?? proof.file_url;
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
                <p className="font-medium">{payment.amount ?? '—'} {payment.currency ?? ''}</p>
                <p className="text-xs text-slate-500">{formatOptionalDate(payment.created_at)}</p>
              </div>
              {(() => {
                if (!payment.status) {
                  return <Badge variant="neutral">—</Badge>;
                }
                const badge = mapPaymentStatusToBadge(payment.status);
                return <Badge variant={badge.variant}>{badge.label}</Badge>;
              })()}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
