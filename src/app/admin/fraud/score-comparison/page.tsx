'use client';

import { useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import { Card, CardContent, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { EmptyState } from '@/components/common/EmptyState';
import { isAdminFraudScoreComparisonEnabled } from '@/lib/featureFlags';
import { useAdminFraudScoreComparison } from '@/lib/queries/admin';
import type { FraudScoreComparisonResponse } from '@/types/api';

function formatScore(score: number | null | undefined) {
  if (score === null || typeof score === 'undefined') return '—';
  return Number.isFinite(score) ? score.toFixed(2) : String(score);
}

function formatList(items: string[] | undefined) {
  if (!items || !items.length) return '—';
  return items.join(', ');
}

function FraudScoresView({ data }: { data: FraudScoreComparisonResponse }) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Fraud score comparison</h1>
        <p className="text-sm text-slate-500">
          Lecture seule pour exercer l’endpoint admin/support /admin/fraud/score_comparison.
        </p>
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-4">
        <div className="text-sm text-slate-600">Proof ID</div>
        <div className="text-lg font-semibold text-slate-900">{data.proof_id}</div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="space-y-2">
            <CardTitle>Rule-based</CardTitle>
            <div className="space-y-1 text-sm text-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Score</span>
                <span className="font-medium text-slate-900">{formatScore(data.rule_based?.score)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">AI risk level</span>
                <span className="font-medium text-slate-900">
                  {data.rule_based?.ai_risk_level ?? '—'}
                </span>
              </div>
              <div>
                <div className="text-slate-600">Fraud flags</div>
                <div className="font-medium text-slate-900">{formatList(data.rule_based?.fraud_flags)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2">
            <CardTitle>ML</CardTitle>
            <div className="space-y-1 text-sm text-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Model version</span>
                <span className="font-medium text-slate-900">{data.ml?.model_version ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Score</span>
                <span className="font-medium text-slate-900">{formatScore(data.ml?.score)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Threshold (medium)</span>
                <span className="font-medium text-slate-900">
                  {formatScore(data.ml?.threshold_medium_risk)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Threshold (high)</span>
                <span className="font-medium text-slate-900">
                  {formatScore(data.ml?.threshold_high_risk)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Suggested decision</span>
                <span className="font-medium text-slate-900">
                  {data.ml?.suggested_decision ?? '—'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function FraudScoreComparisonPage() {
  const [inputValue, setInputValue] = useState('');
  const [proofId, setProofId] = useState<string | undefined>(undefined);

  const flagEnabled = isAdminFraudScoreComparisonEnabled();
  const normalizedProofId = useMemo(() => proofId?.trim() ?? '', [proofId]);

  const comparisonQuery = useAdminFraudScoreComparison(normalizedProofId, {
    enabled: flagEnabled && Boolean(normalizedProofId)
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = inputValue.trim();
    setProofId(trimmed || undefined);
  };

  if (!flagEnabled) {
    return (
      <Card>
        <CardContent className="space-y-2">
          <CardTitle>Fraud score comparison disabled (feature flag off)</CardTitle>
          <p className="text-sm text-slate-600">
            Activez NEXT_PUBLIC_FF_ADMIN_FRAUD_SCORE_COMPARISON pour permettre cette vue en lecture
            seule. Aucun appel API n’est effectué tant que le flag reste désactivé.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <form
        className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"
        onSubmit={handleSubmit}
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="proof-id-input">
              Proof ID (obligatoire)
            </label>
            <Input
              id="proof-id-input"
              placeholder="Ex: 123"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              required
            />
          </div>
          <Button type="submit" className="md:w-40">
            Charger la comparaison
          </Button>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          Scopes requis : admin ou support. L’endpoint retourne un objet unique (pas de pagination).
        </p>
      </form>

      {!proofId ? (
        <EmptyState
          title="Aucun proof sélectionné"
          message="Saisissez un proof ID puis soumettez pour récupérer la comparaison de scores."
        />
      ) : comparisonQuery.isLoading ? (
        <LoadingState label="Chargement de la comparaison de scores..." />
      ) : comparisonQuery.isError ? (
        <div className="p-4">
          <ErrorAlert
            message={
              isAxiosError(comparisonQuery.error) &&
              (comparisonQuery.error.response?.status === 401 ||
                comparisonQuery.error.response?.status === 403)
                ? "Accès refusé : les scopes admin ou support sont requis pour consulter la comparaison."
                : 'Erreur lors du chargement de la comparaison de scores.'
            }
          />
        </div>
      ) : comparisonQuery.data ? (
        <FraudScoresView data={comparisonQuery.data} />
      ) : (
        <EmptyState title="Aucune donnée" message="Aucun résultat pour ce proof ID." />
      )}
    </div>
  );
}
