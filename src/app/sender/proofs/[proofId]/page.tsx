'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { LoadingState } from '@/components/common/LoadingState';
import { useToast } from '@/components/ui/ToastProvider';
import { formatDateTime } from '@/lib/format';
import {
  useProofDecision,
  useProofDetail,
  useRequestAdvisorReview,
  useSenderEscrowSummary
} from '@/lib/queries/sender';
import { canAction } from '@/policy/allowedActions';

const normalizeAiScore = (value: number | string | null | undefined) => {
  if (value === null || value === undefined) return null;
  const numeric = typeof value === 'string' ? Number.parseFloat(value) : value;
  if (Number.isNaN(numeric)) return null;
  const percent = numeric <= 1 ? numeric * 100 : numeric;
  return Math.min(100, Math.max(0, percent));
};

export default function SenderProofInspectionPage() {
  const params = useParams<{ proofId: string }>();
  const proofId = params?.proofId ?? '';
  const proofQuery = useProofDetail(proofId);
  const escrowId = useMemo(
    () => (proofQuery.data?.escrow_id ? String(proofQuery.data.escrow_id) : ''),
    [proofQuery.data?.escrow_id]
  );
  const summaryQuery = useSenderEscrowSummary(escrowId);
  const decisionMutation = useProofDecision();
  const requestAdvisorReview = useRequestAdvisorReview();
  const { showToast } = useToast();
  const [actionError, setActionError] = useState<string | null>(null);

  const scorePercent = useMemo(
    () => normalizeAiScore(proofQuery.data?.ai_score ?? null),
    [proofQuery.data?.ai_score]
  );
  const showScore = scorePercent !== null;
  const aiRiskLevel = proofQuery.data?.ai_risk_level ?? null;
  const aiCheckedAt = proofQuery.data?.ai_checked_at ?? null;
  const aiSummary = proofQuery.data?.ai_summary_text ?? null;
  const aiFlags = proofQuery.data?.ai_flags ?? [];
  const milestone = summaryQuery.data?.milestones?.find(
    (entry) => String(entry.id) === String(proofQuery.data?.milestone_id)
  );

  const canDecideProof = canAction(summaryQuery.data?.viewer_context, 'DECIDE_PROOF');
  const canRequestReview = canAction(
    summaryQuery.data?.viewer_context,
    'REQUEST_ADVISOR_REVIEW'
  );

  if (proofQuery.isLoading) {
    return <LoadingState label="Chargement de la preuve..." />;
  }

  if (proofQuery.isError || !proofQuery.data) {
    return (
      <div className="p-6">
        <ErrorAlert message="Impossible de charger la preuve demandée." />
      </div>
    );
  }

  const handleDecision = async (decision: 'approve' | 'reject') => {
    if (!escrowId) return;
    setActionError(null);
    try {
      await decisionMutation.mutateAsync({
        proofId,
        escrowId,
        payload: { decision }
      });
      showToast(
        decision === 'approve' ? 'Preuve acceptée.' : 'Preuve rejetée.',
        'success'
      );
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Action impossible.');
    }
  };

  const handleRequestAdvisorReview = async () => {
    if (!escrowId) return;
    setActionError(null);
    try {
      await requestAdvisorReview.mutateAsync({ proofId, escrowId, viewer: 'sender' });
      showToast('Demande de revue conseiller envoyée.', 'success');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Action impossible.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
        <header className="rounded-2xl border border-slate-200 bg-white px-6 py-5">
          <h1 className="text-2xl font-semibold text-slate-900">Inspection de la preuve</h1>
          <div className="mt-2 text-sm text-slate-600">
            ID Preuve: <span className="font-semibold text-slate-900">{proofId}</span>
          </div>
          {proofQuery.data.status ? (
            <div className="mt-1 text-sm text-slate-500">
              Statut: <span className="font-medium text-slate-700">{proofQuery.data.status}</span>
            </div>
          ) : null}
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Résumé IA</h2>
              <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
                {aiSummary ? aiSummary : 'Résumé IA non disponible.'}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Indicateurs IA détectés</h2>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {aiFlags && aiFlags.length > 0 ? (
                  aiFlags.map((flag) => (
                    <Badge key={flag} variant="outline" className="text-xs uppercase">
                      {flag}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-slate-500">
                    Aucun indicateur IA détecté.
                  </span>
                )}
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Scoring de la preuve</h2>
              <div className="mt-6 flex flex-col items-center gap-4">
                <div className="relative">
                  <svg width="220" height="120" viewBox="0 0 220 120" className="text-slate-200">
                    <path
                      d="M 20 100 A 90 90 0 0 1 200 100"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="none"
                      pathLength={100}
                      strokeLinecap="round"
                    />
                    <path
                      d="M 20 100 A 90 90 0 0 1 200 100"
                      stroke="#10b981"
                      strokeWidth="12"
                      fill="none"
                      pathLength={100}
                      strokeDasharray={100}
                      strokeDashoffset={showScore ? 100 - scorePercent : 100}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pt-6">
                    <div className="text-3xl font-semibold text-slate-900">
                      {showScore ? `${Math.round(scorePercent)}%` : '—'}
                    </div>
                    <div className="text-sm text-slate-500">Score IA</div>
                  </div>
                </div>
                <div className="text-sm text-slate-600">
                  Confiance IA{' '}
                  <span className="font-semibold text-slate-900">
                    {aiRiskLevel ?? '—'}
                  </span>
                </div>
                {aiCheckedAt ? (
                  <div className="text-xs text-slate-500">
                    Analyse IA: {formatDateTime(aiCheckedAt)}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">Détails de l’escrow</h3>
              <dl className="mt-4 space-y-3 text-sm text-slate-600">
                <div>
                  <dt className="text-xs uppercase text-slate-400">Escrow ID</dt>
                  <dd className="font-medium text-slate-900">{escrowId || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-slate-400">Montant total</dt>
                  <dd className="font-medium text-slate-900">
                    {summaryQuery.data?.escrow?.amount_total && summaryQuery.data?.escrow?.currency
                      ? `${summaryQuery.data.escrow.amount_total} ${summaryQuery.data.escrow.currency}`
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-slate-400">Statut</dt>
                  <dd className="font-medium text-slate-900">
                    {summaryQuery.data?.escrow?.status ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-slate-400">Échéance</dt>
                  <dd className="font-medium text-slate-900">
                    {summaryQuery.data?.escrow?.deadline_at
                      ? formatDateTime(summaryQuery.data.escrow.deadline_at)
                      : '—'}
                  </dd>
                </div>
              </dl>
            </div>

            {milestone ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900">Détails de l’étape</h3>
                <dl className="mt-4 space-y-3 text-sm text-slate-600">
                  <div>
                    <dt className="text-xs uppercase text-slate-400">Étape</dt>
                    <dd className="font-medium text-slate-900">
                      Étape {milestone.sequence_index}: {milestone.label}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-slate-400">Montant</dt>
                    <dd className="font-medium text-slate-900">
                      {milestone.amount} {milestone.currency}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-slate-400">Statut</dt>
                    <dd className="font-medium text-slate-900">{milestone.status}</dd>
                  </div>
                </dl>
              </div>
            ) : null}
          </aside>
        </div>

        {(canDecideProof || (!canDecideProof && canRequestReview)) && (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-end gap-3">
              {canDecideProof ? (
                <>
                  <Button
                    type="button"
                    className="bg-emerald-600 text-white hover:bg-emerald-500 focus:ring-emerald-500"
                    onClick={() => handleDecision('approve')}
                    disabled={decisionMutation.isPending}
                  >
                    Accepter la preuve
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => handleDecision('reject')}
                    disabled={decisionMutation.isPending}
                  >
                    Rejeter la preuve
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  className="bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-600"
                  onClick={handleRequestAdvisorReview}
                  disabled={requestAdvisorReview.isPending}
                >
                  Demander revue conseiller
                </Button>
              )}
            </div>
            {actionError ? (
              <div className="mt-3 text-sm text-rose-600">{actionError}</div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
