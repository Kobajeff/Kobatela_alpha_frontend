'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { LoadingState } from '@/components/common/LoadingState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { extractErrorMessage } from '@/lib/apiClient';
import { normalizeApiError } from '@/lib/apiError';
import { formatDateTime } from '@/lib/format';
import { useProofDetail } from '@/lib/queries/proofs';
import { useSenderEscrowSummary } from '@/lib/queries/sender';

export default function ProviderProofDetailPage() {
  const params = useParams<{ id: string; proofId: string }>();
  const escrowId = params?.id ?? '';
  const proofId = params?.proofId ?? '';
  const proofQuery = useProofDetail(proofId);
  const escrowSummaryQuery = useSenderEscrowSummary(escrowId, { viewer: 'provider' });

  const proof = proofQuery.data;
  const proofDisplayId = proof?.proof_id ?? proof?.id ?? proofId;

  const milestone = useMemo(() => {
    if (!proof?.milestone_id || !escrowSummaryQuery.data) return null;
    return (
      escrowSummaryQuery.data.milestones.find(
        (item) => String(item.id) === String(proof.milestone_id)
      ) ?? null
    );
  }, [escrowSummaryQuery.data, proof?.milestone_id]);

  if (proofQuery.isLoading) {
    return <LoadingState label="Chargement de la preuve…" />;
  }

  if (proofQuery.isError) {
    const status = normalizeApiError(proofQuery.error).status;
    const statusMessage = status === 403 ? 'Accès restreint.' : null;
    return (
      <div className="p-4">
        <ErrorAlert message={statusMessage ?? extractErrorMessage(proofQuery.error)} />
      </div>
    );
  }

  if (!proof) {
    return null;
  }

  const aiFlags = proof.ai_flags ?? [];
  const hasAiFlags = aiFlags.length > 0;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="text-sm text-slate-500">Portail du prestataire</div>
        <h1 className="text-2xl font-semibold text-slate-900">Inspection de la preuve</h1>
        <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span aria-hidden="true">💡</span>
          <span>
            Vous visualisez une preuve associée à l&apos;un de vos séquestres, en lecture seule.
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-700">
        <div className="font-medium">ID Preuve: {proofDisplayId}</div>
        <div className="flex items-center gap-2">
          <span>Statut:</span>
          <StatusBadge type="proof" status={proof.status} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Document soumis</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-[1.2fr,1fr]">
            <div className="flex items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50 p-6 text-slate-500">
              <div className="text-center">
                <div className="text-4xl">📄</div>
                <div className="mt-2 text-sm">Aperçu non disponible.</div>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <p className="text-sm text-slate-600">
                Le document est disponible au téléchargement pour consultation.
              </p>
              <a
                href={proof.storage_url}
                download
                className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
                Télécharger la preuve
              </a>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Statut de la preuve</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusBadge type="proof" status={proof.status} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Détails de l&apos;escrow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-700">
              <div>Escrow ID: {proof.escrow_id}</div>
              {escrowSummaryQuery.isLoading && <div>Chargement des détails…</div>}
              {escrowSummaryQuery.isError && (
                <div>
                  {normalizeApiError(escrowSummaryQuery.error).status === 403
                    ? 'Accès restreint.'
                    : extractErrorMessage(escrowSummaryQuery.error)}
                </div>
              )}
              {escrowSummaryQuery.data && (
                <>
                  <div>
                    Montant total: {escrowSummaryQuery.data.escrow.amount_total}{' '}
                    {escrowSummaryQuery.data.escrow.currency}
                  </div>
                  <div>
                    Date limite:{' '}
                    {escrowSummaryQuery.data.escrow.deadline_at
                      ? formatDateTime(escrowSummaryQuery.data.escrow.deadline_at)
                      : '—'}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {milestone && (
            <Card>
              <CardHeader>
                <CardTitle>Détails de l&apos;étape</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-700">
                <div>Étape ID: {milestone.id}</div>
                <div>
                  Montant de l&apos;étape: {milestone.amount} {milestone.currency}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Explication IA</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-700">
              {hasAiFlags ? (
                <ul className="list-disc space-y-1 pl-5">
                  {aiFlags.map((flag) => (
                    <li key={flag}>{flag}</li>
                  ))}
                </ul>
              ) : (
                <p>Analyse non disponible pour ce rôle.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
