'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { LoadingState } from '@/components/common/LoadingState';
import { useToast } from '@/components/ui/ToastProvider';
import { formatDateTime } from '@/lib/format';
import { extractErrorMessage } from '@/lib/apiClient';
import {
  useExternalProofTokenDetail,
  useExternalProofTokensList,
  useIssueExternalProofToken,
  useRevokeExternalProofToken
} from '@/lib/queries/externalProofTokens';
import { useSenderEscrowSummary } from '@/lib/queries/sender';
import type {
  ExternalProofToken,
  ExternalProofTokenIssuePayload,
  ExternalProofTokenStatus
} from '@/types/api';

function mapTokenStatus(status: ExternalProofTokenStatus) {
  switch (status) {
    case 'ACTIVE':
      return { label: 'Actif', variant: 'success' as const };
    case 'EXPIRED':
      return { label: 'Expiré', variant: 'muted' as const };
    case 'REVOKED':
      return { label: 'Révoqué', variant: 'danger' as const };
    case 'USED':
      return { label: 'Utilisé', variant: 'warning' as const };
    default:
      return { label: status, variant: 'default' as const };
  }
}

function TokenRow({
  token,
  onSelect,
  onRevoke
}: {
  token: ExternalProofToken;
  onSelect: (tokenId: string | number) => void;
  onRevoke: (tokenId: string | number) => void;
}) {
  const badge = mapTokenStatus(token.status);
  return (
    <div className="flex flex-col gap-2 rounded-md border border-slate-200 bg-white p-3 shadow-sm md:flex-row md:items-center md:justify-between">
      <div className="space-y-1 text-sm text-slate-700">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">Jeton #{token.token_id}</span>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>
        <div className="text-xs text-slate-500">
          Jalon : #{token.target.milestone_idx} — Expire le {formatDateTime(token.expires_at)}
        </div>
        {token.note && <div className="text-xs text-slate-600">Note: {token.note}</div>}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => onSelect(token.token_id)}>
          Voir le détail
        </Button>
        <Button variant="danger" onClick={() => onRevoke(token.token_id)}>
          Révoquer
        </Button>
      </div>
    </div>
  );
}

function TokenDetail({
  token
}: {
  token: ExternalProofToken;
}) {
  const badge = mapTokenStatus(token.status);
  const fields: Array<[string, string | null | undefined]> = [
    ['Identifiant', String(token.token_id)],
    ['Statut', badge.label],
    ['Jalon', token.target?.milestone_idx ? `#${token.target.milestone_idx}` : '—'],
    ['Escrow', token.target?.escrow_id ? String(token.target.escrow_id) : '—'],
    ['Expiration', token.expires_at ? formatDateTime(token.expires_at) : '—'],
    ['Créé le', token.created_at ? formatDateTime(token.created_at) : '—'],
    ['Dernière utilisation', token.last_used_at ? formatDateTime(token.last_used_at) : '—'],
    ['Révoqué le', token.revoked_at ? formatDateTime(token.revoked_at) : '—'],
    ['Note', token.note ?? '—']
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Détails du jeton</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-slate-700">
        <Badge variant={badge.variant}>{badge.label}</Badge>
        <dl className="space-y-2">
          {fields.map(([label, value]) => (
            <div key={label} className="flex flex-col gap-1 sm:flex-row sm:gap-3">
              <dt className="w-40 text-slate-500">{label}</dt>
              <dd className="font-medium text-slate-800">{value ?? '—'}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

export default function ExternalProofTokensPage() {
  const params = useParams<{ id: string }>();
  const escrowId = params?.id ?? '';
  const escrowQuery = useSenderEscrowSummary(escrowId);
  const listFilters = useMemo(() => ({ escrow_id: escrowId }), [escrowId]);
  const tokensQuery = useExternalProofTokensList(listFilters);
  const [selectedTokenId, setSelectedTokenId] = useState<string | number | null>(null);
  const tokenDetailQuery = useExternalProofTokenDetail(selectedTokenId);
  const issueToken = useIssueExternalProofToken();
  const [issuedToken, setIssuedToken] = useState<ExternalProofToken | null>(null);
  const revokeToken = useRevokeExternalProofToken();
  const [formState, setFormState] = useState<ExternalProofTokenIssuePayload>({
    escrow_id: escrowId,
    milestone_idx: 1,
    expires_in_minutes: 10_080,
    max_uploads: 1
  });
  const [confirmText, setConfirmText] = useState('');
  const [origin, setOrigin] = useState<string>('');
  const { showToast } = useToast();

  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showToast(`${label} copié`, 'success');
    } catch (error) {
      showToast('Impossible de copier dans le presse-papiers.', 'error');
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (escrowQuery.data?.milestones?.length) {
      const firstMilestone = escrowQuery.data.milestones[0];
      setFormState((prev) => ({
        ...prev,
        escrow_id: escrowId,
        milestone_idx: firstMilestone.sequence_index ?? firstMilestone.id ?? 1
      }));
    }
  }, [escrowId, escrowQuery.data?.milestones]);

  const milestoneOptions = useMemo(() => {
    return (escrowQuery.data?.milestones ?? []).map((milestone) => ({
      value: milestone.sequence_index ?? milestone.id,
      label: `${milestone.label ?? 'Jalon'} (#${milestone.sequence_index})`
    }));
  }, [escrowQuery.data?.milestones]);

  const hasMilestones = milestoneOptions.length > 0;
  const portalLink = origin ? `${origin}/external` : '';

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIssuedToken(null);
    try {
      const payload: ExternalProofTokenIssuePayload = {
        ...formState,
        escrow_id: escrowId,
        milestone_idx: Number(formState.milestone_idx)
      };
      const created = await issueToken.mutateAsync(payload);
      setIssuedToken(created);
      setSelectedTokenId(created.token_id);
      setConfirmText('');
      showToast('Jeton créé avec succès.', 'success');
      tokensQuery.refetch();
    } catch (error) {
      showToast(extractErrorMessage(error), 'error');
    }
  };

  const handleRevoke = async (tokenId: string | number) => {
    if (confirmText !== 'REVOKE') {
      showToast('Saisissez REVOKE pour confirmer la révocation.', 'error');
      return;
    }
    try {
      setSelectedTokenId(tokenId);
      await revokeToken.mutateAsync(tokenId);
      showToast('Jeton révoqué.', 'success');
      setConfirmText('');
    } catch (error) {
      showToast(extractErrorMessage(error), 'error');
    }
  };

  if (escrowQuery.isLoading) {
    return <LoadingState label="Chargement du dossier..." />;
  }

  if (escrowQuery.isError) {
    return <ErrorAlert message={extractErrorMessage(escrowQuery.error)} />;
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Jetons de preuve externe</h1>
          <p className="text-sm text-slate-600">
            Générer et gérer les liens sécurisés pour permettre aux bénéficiaires de téléverser une preuve.
          </p>
        </div>
        <div className="text-sm text-slate-700">
          Escrow #{escrowId}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Créer un jeton</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800">Jalon ciblé</label>
              <Select
                value={String(formState.milestone_idx ?? '')}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    milestone_idx: Number(event.target.value)
                  }))
                }
                required
                disabled={!hasMilestones}
              >
                {hasMilestones ? (
                  milestoneOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))
                ) : (
                  <option value="">Aucun jalon disponible</option>
                )}
              </Select>
              <p className="text-xs text-slate-500">
                Les jetons sont liés à un jalon précis. Un jeton expiré ou révoqué ne peut plus être utilisé.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-800">Expiration (minutes)</label>
                <Input
                  type="number"
                  min={10}
                  max={43_200}
                  value={formState.expires_in_minutes ?? ''}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      expires_in_minutes: Number(event.target.value)
                    }))
                  }
                  required
                />
                <p className="text-xs text-slate-500">
                  Min 10, max 43 200 (7 jours par défaut).
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-800">Téléversements autorisés</label>
                <Input
                  type="number"
                  min={1}
                  value={formState.max_uploads ?? 1}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      max_uploads: Number(event.target.value)
                    }))
                  }
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-800">Email destinataire (optionnel)</label>
                <Input
                  type="email"
                  placeholder="beneficiaire@example.com"
                  value={formState.issued_to_email ?? ''}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      issued_to_email: event.target.value || undefined
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-800">Note interne (optionnel)</label>
                <Input
                  placeholder="Contexte ou instructions"
                  value={formState.note ?? ''}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      note: event.target.value || undefined
                    }))
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={issueToken.isPending || !hasMilestones}>
                {issueToken.isPending ? 'Création...' : 'Créer le jeton'}
              </Button>
              {issueToken.isError && (
                <span className="text-sm text-rose-700">{extractErrorMessage(issueToken.error)}</span>
              )}
            </div>
          </form>

          {issuedToken?.token && (
            <div className="mt-6 space-y-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <div className="font-semibold">Jeton généré — affiché une seule fois</div>
              <p>
                Copiez le jeton (secret) et partagez-le séparément du lien portail ci-dessous. Aucun
                secret n&apos;est présent dans l’URL et le jeton n’est jamais ré-affiché après
                rafraîchissement.
              </p>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="space-y-1">
                  <div className="text-xs uppercase text-amber-800">Jeton</div>
                  <div className="flex items-center gap-2">
                    <Input readOnly value={issuedToken.token} />
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => handleCopy(issuedToken.token as string, 'Jeton')}
                    >
                      Copier
                    </Button>
                  </div>
                </div>
                {portalLink && (
                  <div className="space-y-1">
                    <div className="text-xs uppercase text-amber-800">Lien portail (sans secret)</div>
                    <div className="flex items-center gap-2">
                      <Input readOnly value={portalLink} />
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => handleCopy(portalLink, 'Lien')}
                      >
                        Copier
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <CardTitle>Jetons existants</CardTitle>
          <div className="text-xs text-slate-500">
            Aucun secret n&apos;est affiché après la création. Seuls le statut et l&apos;expiration sont visibles.
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {tokensQuery.isLoading && <LoadingState label="Chargement des jetons..." />}
          {tokensQuery.isError && <ErrorAlert message={extractErrorMessage(tokensQuery.error)} />}
          {!tokensQuery.isLoading && !tokensQuery.isError && (
            <div className="space-y-3">
              {(tokensQuery.data ?? []).length === 0 && (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                  Aucun jeton créé pour cet escrow.
                </div>
              )}
              {(tokensQuery.data ?? []).map((token) => (
                <TokenRow
                  key={token.token_id}
                  token={token}
                  onSelect={(tokenId) => setSelectedTokenId(tokenId)}
                  onRevoke={handleRevoke}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedTokenId && tokenDetailQuery.isLoading && <LoadingState label="Chargement du jeton..." />}
      {selectedTokenId && tokenDetailQuery.data && <TokenDetail token={tokenDetailQuery.data} />}

      <Card>
        <CardHeader>
          <CardTitle>Révocation sécurisée</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-slate-700">
            Pour révoquer un jeton, saisissez <code className="rounded bg-slate-100 px-1">REVOKE</code> puis cliquez sur Révoquer.
            Les jetons révoqués renverront un statut 410 sur le portail externe.
          </p>
          <Input
            placeholder="Tapez REVOKE pour confirmer"
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
          />
          <p className="text-xs text-slate-500">
            Les révocations sont idempotentes et mises à jour en temps réel via l&apos;API.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
