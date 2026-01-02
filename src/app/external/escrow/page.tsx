'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { Input } from '@/components/ui/Input';
import {
  clearExternalToken,
  consumeExternalTokenFromQuery,
  getExternalToken,
  setExternalToken
} from '@/lib/external/externalSession';
import { useExternalEscrowSummary } from '@/lib/queries/external';
import { mapExternalErrorMessage } from '@/lib/external/externalErrorMessages';
import { normalizeApiError } from '@/lib/apiError';
import { LoadingState } from '@/components/common/LoadingState';

function ExternalEscrowPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [proofToFollow, setProofToFollow] = useState('');

  useEffect(() => {
    const fromQuery = consumeExternalTokenFromQuery(searchParams, { replacePath: '/external/escrow' });
    if (fromQuery) {
      setToken(fromQuery);
      return;
    }
    const stored = getExternalToken();
    if (stored) {
      setToken(stored);
    }
  }, [searchParams]);

  const {
    data,
    isLoading,
    refetch,
    error: queryError
  } = useExternalEscrowSummary(token ?? undefined);

  useEffect(() => {
    if (!token) {
      setError("Lien requis. Utilisez le lien sécurisé transmis par l’expéditeur.");
    } else {
      setError(null);
    }
  }, [token]);

  useEffect(() => {
    if (queryError) {
      const mapped = mapExternalErrorMessage(queryError);
      setError(mapped);
      const normalized = normalizeApiError(queryError);
      if (normalized.status === 401 || normalized.status === 403 || normalized.status === 410) {
        clearExternalToken();
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

  const handleFollowProof = () => {
    if (!token || !proofToFollow) return;
    router.push(`/external/proofs/${proofToFollow}`);
  };

  const missingToken = !token;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Résumé de l&apos;escrow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-700">
          <p>
            Étape 2/5 : vérifiez que le lien pointe vers le bon dossier avant de déposer votre
            fichier.
          </p>
          {error && <ErrorAlert message={error} />}
          {missingToken && (
            <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-800">
                Lien sécurisé manquant. Reprenez depuis l’accueil pour coller le jeton.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Button type="button" onClick={() => router.push('/external')} variant="secondary">
                  Retour à l’accueil
                </Button>
              </div>
            </div>
          )}
          <form className="flex flex-col gap-3" onSubmit={handleFetch}>
            <Button type="submit" disabled={!token || isLoading}>
              {isLoading ? 'Chargement...' : 'Afficher le résumé'}
            </Button>
          </form>
          {data && (
            <div className="space-y-3 rounded-md border border-slate-200 bg-white p-4">
              <div className="text-base font-semibold text-slate-900">
                Dossier #{data.escrow_id} — {data.status}
              </div>
              {data.amount_total && (
                <div className="text-sm text-slate-700">
                  Montant total: {data.amount_total} {data.currency ?? ''}
                </div>
              )}
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
              <div className="flex flex-wrap gap-3 pt-2">
                <Button type="button" onClick={handleUploadRedirect} disabled={!token}>
                  Déposer une preuve
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleFollowProof}
                  disabled={!token || !proofToFollow}
                >
                  Suivre une preuve existante
                </Button>
              </div>
              <div className="space-y-2 pt-2">
                <label className="text-xs font-medium text-slate-800">
                  Identifiant de preuve (optionnel)
                  <span className="block text-[11px] font-normal text-slate-600">
                    Permet de consulter une preuve déjà déposée avec ce lien.
                  </span>
                </label>
                <Input
                  value={proofToFollow}
                  onChange={(event) => setProofToFollow(event.target.value.trim())}
                  placeholder="Ex: 1024"
                  disabled={!token}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ExternalEscrowPage() {
  return (
    <Suspense fallback={<LoadingState label="Chargement..." />}>
      <ExternalEscrowPageContent />
    </Suspense>
  );
}
