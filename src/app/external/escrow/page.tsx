'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { getExternalTokenFromStorage, getExternalTokenFromUrl } from '@/lib/externalAuth';
import { useExternalEscrowSummary } from '@/lib/queries/external';
import { mapExternalErrorMessage } from '@/lib/api/externalClient';

export default function ExternalEscrowPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [escrowIdInput, setEscrowIdInput] = useState('');
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
    if (stored) {
      setToken(stored);
    }
  }, [tokenFromUrl]);

  const escrowIdParam = useMemo(() => {
    if (!searchParams) return null;
    return searchParams.get('escrowId') ?? searchParams.get('escrow_id');
  }, [searchParams]);

  useEffect(() => {
    if (escrowIdParam) {
      setEscrowIdInput(escrowIdParam);
    }
  }, [escrowIdParam]);

  const {
    data,
    isLoading,
    refetch,
    error: queryError
  } = useExternalEscrowSummary(
    token,
    escrowIdInput || escrowIdParam
  );

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

  const handleFetch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    refetch().catch((err) => {
      setError(mapExternalErrorMessage(err));
    });
  };

  const handleUploadRedirect = () => {
    if (!token || !escrowIdInput) return;
    const params = new URLSearchParams({ token, escrowId: escrowIdInput });
    router.push(`/external/proofs/upload?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Résumé de l&apos;escrow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-700">
            <p>
              Consultez le statut associé à votre lien sécurisé. Saisissez l’identifiant d’escrow si
              nécessaire.
            </p>
            <form className="flex flex-col gap-3" onSubmit={handleFetch}>
              <label className="text-sm font-medium text-slate-800">
                Identifiant d&apos;escrow
              </label>
              <Input
                value={escrowIdInput}
                onChange={(event) => setEscrowIdInput(event.target.value.trim())}
                placeholder="Ex: 1024"
              />
              <Button type="submit" disabled={!token || !escrowIdInput || isLoading}>
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
                    disabled={!escrowIdInput || !token}
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
