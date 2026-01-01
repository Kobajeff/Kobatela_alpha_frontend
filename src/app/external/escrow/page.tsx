'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import {
  clearExternalToken,
  getExternalToken,
  readTokenFromQuery,
  setExternalToken
} from '@/lib/external/externalSession';
import { useExternalEscrowSummary } from '@/lib/queries/external';
import { mapExternalErrorMessage } from '@/lib/api/externalClient';
import { normalizeApiError } from '@/lib/apiError';

export default function ExternalEscrowPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tokenFromUrl = useMemo(() => {
    if (!searchParams) return null;
    return readTokenFromQuery(searchParams);
  }, [searchParams]);

  useEffect(() => {
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      setExternalToken(tokenFromUrl);
      router.replace('/external/escrow');
    } else {
      const stored = getExternalToken();
      if (stored) {
        setToken(stored);
      }
    }
  }, [router, tokenFromUrl]);

  const {
    data,
    isLoading,
    refetch,
    error: queryError
  } = useExternalEscrowSummary(token ?? undefined);

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
      const normalized = normalizeApiError(queryError);
      if (normalized.status === 401) {
        clearExternalToken();
        router.replace('/external?error=invalid_token');
      }
    }
  }, [queryError, router]);

  const handleFetch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    refetch().catch((err) => {
      setError(mapExternalErrorMessage(err));
    });
  };

  const handleUploadRedirect = () => {
    if (!token) return;
    router.push('/external/proofs/upload');
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Résumé de l&apos;escrow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-700">
            <p>Consultez le statut associé à votre lien sécurisé.</p>
            <form className="flex flex-col gap-3" onSubmit={handleFetch}>
              <Button type="submit" disabled={!token || isLoading}>
                {isLoading ? 'Chargement...' : 'Afficher le résumé'}
              </Button>
            </form>
            {error && <ErrorAlert message={error} />}
            {data && (
              <div className="space-y-2 rounded-md border border-slate-200 bg-white p-4">
                <div className="text-base font-semibold text-slate-900">
                  Escrow #{data.escrow_id} — {data.status}
                </div>
                <div className="text-sm text-slate-700">
                  Montant total: {data.amount_total ?? '—'} {data.currency ?? ''}
                </div>
                {data.milestones.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-slate-800">Jalons</div>
                    {data.milestones.map((milestone) => (
                      <div
                        key={milestone.milestone_idx}
                        className="rounded border border-slate-100 bg-slate-50 p-3"
                      >
                        <div className="text-sm font-semibold text-slate-900">
                          Jalon #{milestone.milestone_idx} — {milestone.label ?? 'Sans libellé'}
                        </div>
                        <div className="text-xs text-slate-700">
                          Statut: {milestone.status ?? '—'} | Dernière preuve:{' '}
                          {milestone.last_proof_status ?? '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="pt-2">
                  <Button
                    type="button"
                    onClick={handleUploadRedirect}
                    disabled={!token}
                  >
                    Déposer une preuve
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
