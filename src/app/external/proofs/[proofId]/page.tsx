'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import {
  clearExternalToken,
  consumeExternalTokenFromQuery,
  getExternalToken
} from '@/lib/external/externalSession';
import { useExternalProofStatus } from '@/lib/queries/external';
import { mapExternalErrorMessage } from '@/lib/external/externalErrorMessages';
import { normalizeApiError } from '@/lib/apiError';

export default function ExternalProofStatusPage() {
  const params = useParams<{ proofId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stoppedReason, setStoppedReason] = useState<string | null>(null);
  const proofId = params?.proofId;

  useEffect(() => {
    const tokenFromUrl = consumeExternalTokenFromQuery(searchParams, {
      replacePath: `/external/proofs/${proofId ?? ''}`
    });
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      return;
    }
    const stored = getExternalToken();
    if (stored) {
      setToken(stored);
    }
  }, [proofId, searchParams]);

  const {
    data,
    isLoading,
    error: queryError,
    stoppedReason: pollingStopped,
    lastAuthErrorStatus
  } = useExternalProofStatus(token, proofId);

  useEffect(() => {
    if (!pollingStopped) {
      setStoppedReason(null);
    } else {
      setStoppedReason(pollingStopped);
    }
  }, [pollingStopped]);

  useEffect(() => {
    if (!token) {
      setError("Lien invalide ou expiré. Demandez un nouveau lien à l’expéditeur.");
    } else {
      setError(null);
    }
  }, [token]);

  useEffect(() => {
    if (pollingStopped) {
      setStoppedReason(pollingStopped);
    }
    if (queryError) {
      const mapped = mapExternalErrorMessage(queryError);
      setError(mapped);
    }
    const normalized = queryError ? normalizeApiError(queryError) : null;
    const statusToClear = lastAuthErrorStatus ?? normalized?.status;
    if (statusToClear && [401, 403, 410].includes(statusToClear)) {
      clearExternalToken();
    }
  }, [lastAuthErrorStatus, pollingStopped, queryError]);

  const statusLabel = data?.status ?? '—';
  const isTerminal = Boolean(data?.terminal);
  const terminalMessage = isTerminal
    ? 'Décision finale reçue. Vous pouvez fermer cette page ou conserver le reçu.'
    : 'Votre preuve est en cours de revue. Cette page se met à jour automatiquement.';

  const missingProofId = !proofId;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Statut de la preuve</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-700">
          <p>Étape 5/5 : suivez la décision finale. Le suivi s’arrête lorsque le statut est final.</p>
          {missingProofId && (
            <ErrorAlert message="Identifiant de preuve requis. Utilisez le lien de suivi reçu après la soumission." />
          )}
          {error && <ErrorAlert message={error} />}
          {stoppedReason && <ErrorAlert message={stoppedReason} />}
          {isLoading && <div>Chargement…</div>}
          {data && !isLoading && (
            <div className="space-y-2 rounded-md border border-slate-200 bg-white p-4">
              <div className="text-base font-semibold text-slate-900">
                Preuve #{data.proof_id}
              </div>
              <div>Escrow: {data.escrow_id}</div>
              <div>Jalon: {data.milestone_idx}</div>
              <div className="text-sm font-medium text-slate-900">
                Statut: <span className="text-indigo-700">{statusLabel}</span>
              </div>
              <div className="text-xs text-slate-600">Soumise le: {data.submitted_at}</div>
              {data.reviewed_at && (
                <div className="text-xs text-slate-600">Décision: {data.reviewed_at}</div>
              )}
              <div className="text-xs text-slate-700">{terminalMessage}</div>
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push('/external/escrow')}
            >
              Retour au résumé
            </Button>
            <Button
              type="button"
              onClick={() => router.push('/external/proofs/upload')}
              disabled={!token || !data || !isTerminal}
            >
              {isTerminal ? 'Déposer une nouvelle preuve' : 'Attendez la décision'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
