'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { getExternalTokenFromStorage, getExternalTokenFromUrl } from '@/lib/externalAuth';
import { useExternalProofStatus } from '@/lib/queries/external';
import { mapExternalErrorMessage } from '@/lib/api/externalClient';

export default function ExternalProofStatusPage() {
  const params = useParams<{ proofId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tokenFromUrl = useMemo(() => {
    if (!searchParams) return null;
    return getExternalTokenFromUrl(searchParams);
  }, [searchParams]);

  useEffect(() => {
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      return;
    }
    const stored = getExternalTokenFromStorage();
    if (stored) setToken(stored);
  }, [tokenFromUrl]);

  const { data, isLoading, error: queryError } = useExternalProofStatus(token, params?.proofId);

  useEffect(() => {
    if (!token) {
      setError("Lien invalide ou expiré. Demandez un nouveau lien à l’expéditeur.");
    } else {
      setError(null);
    }
  }, [token]);

  useEffect(() => {
    if (queryError) {
      setError(mapExternalErrorMessage(queryError));
    }
  }, [queryError]);

  const statusLabel = data?.status ?? '—';

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Statut de la preuve</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-700">
            <p>Suivez l&apos;état de la preuve envoyée via votre lien sécurisé.</p>
            {error && <ErrorAlert message={error} />}
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
                <div className="text-xs text-slate-600">Créée le: {data.created_at}</div>
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (!token || !data?.escrow_id) {
                    setError(mapExternalErrorMessage(new Error('Token requis')));
                    return;
                  }
                  const paramsEscrow = new URLSearchParams({
                    token,
                    escrowId: String(data.escrow_id)
                  });
                  router.push(`/external/escrow?${paramsEscrow.toString()}`);
                }}
              >
                Retour au résumé
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (!token || !data?.escrow_id) return;
                  const paramsUpload = new URLSearchParams({
                    token,
                    escrowId: String(data.escrow_id)
                  });
                  router.push(`/external/proofs/upload?${paramsUpload.toString()}`);
                }}
              >
                Déposer une nouvelle preuve
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
