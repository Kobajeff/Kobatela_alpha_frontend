'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { extractErrorMessage, isForbiddenError } from '@/lib/apiClient';
import { useSenderEscrows } from '@/lib/queries/sender';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import type { EscrowStatus } from '@/types/api';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { StatusBadge } from '@/components/common/StatusBadge';

const STATUS_OPTIONS: { label: string; value: '' | EscrowStatus }[] = [
  { label: 'Tous', value: '' },
  { label: 'Brouillon', value: 'DRAFT' },
  { label: 'Actif', value: 'ACTIVE' },
  { label: 'Financé', value: 'FUNDED' },
  { label: 'Prêt à libérer', value: 'RELEASABLE' },
  { label: 'Libéré', value: 'RELEASED' },
  { label: 'Remboursé', value: 'REFUNDED' },
  { label: 'Annulé', value: 'CANCELLED' }
];

const PAYMENT_MODE_LABELS: Record<string, string> = {
  MILESTONE: 'Escrow',
  DIRECT_PAY: 'Direct Pay'
};

export default function SenderEscrowsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'' | EscrowStatus>('');
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    setPage(1);
  }, [status]);

  const offset = useMemo(() => (page - 1) * limit, [page, limit]);
  const senderQuery = useSenderEscrows({ status: status || undefined, limit, offset });
  const escrows = senderQuery.data ?? [];
  const isForbidden = senderQuery.isError && isForbiddenError(senderQuery.error);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Envois sécurisés</h1>
          <p className="text-sm text-slate-600">
            Voici la liste des escrows que vous avez initiés en tant qu&apos;expéditeur.
            Sélectionnez-en un pour voir les détails complets et gérer l&apos;escrow.
          </p>
        </div>
        <Button onClick={() => router.push('/sender/escrows/create')}>+ Créer un escrow</Button>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <Select disabled value="">
                  <option value="">Année</option>
                </Select>
                <span className="text-[11px] text-slate-400">Disponible bientôt</span>
              </div>
              <div className="flex flex-col gap-1">
                <Select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as EscrowStatus | '')}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value || 'all'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Select disabled value="">
                  <option value="">Mode</option>
                </Select>
                <span className="text-[11px] text-slate-400">Disponible bientôt</span>
              </div>
            </div>
            <div className="flex w-full flex-col gap-1 lg:max-w-sm">
              <Input disabled placeholder="Rechercher un escrow..." />
              <span className="text-[11px] text-slate-400">Disponible bientôt</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            <span>Filtres basés sur l&apos;API :</span>
            <Badge variant="muted">Statut</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {senderQuery.isLoading ? (
            <LoadingState label="Chargement des envois sécurisés..." fullHeight={false} />
          ) : senderQuery.isError ? (
            <ErrorAlert message={isForbidden ? 'Accès restreint.' : extractErrorMessage(senderQuery.error)} />
          ) : escrows.length ? (
            <>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Titre / description</th>
                      <th className="px-3 py-2">Montant</th>
                      <th className="px-3 py-2">Statut</th>
                      <th className="px-3 py-2">Mode</th>
                      <th className="px-3 py-2">Dernière mise à jour</th>
                      <th className="px-3 py-2" aria-label="Détails" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {escrows.map((escrow) => {
                      const paymentLabel = escrow.payment_mode
                        ? PAYMENT_MODE_LABELS[escrow.payment_mode] ?? escrow.payment_mode
                        : null;
                      return (
                        <tr
                          key={escrow.id}
                          className="cursor-pointer hover:bg-slate-50"
                          role="button"
                          tabIndex={0}
                          onClick={() => router.push(`/sender/escrows/${escrow.id}`)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              router.push(`/sender/escrows/${escrow.id}`);
                            }
                          }}
                        >
                          <td className="px-3 py-2 font-medium text-indigo-600">#{escrow.id}</td>
                          <td className="px-3 py-2 text-slate-500">—</td>
                          <td className="px-3 py-2">
                            {escrow.amount_total} {escrow.currency}
                          </td>
                          <td className="px-3 py-2">
                            <StatusBadge type="escrow" status={escrow.status} />
                          </td>
                          <td className="px-3 py-2">
                            {paymentLabel ? <Badge variant="neutral">{paymentLabel}</Badge> : '—'}
                          </td>
                          <td className="px-3 py-2 text-slate-500">—</td>
                          <td className="px-3 py-2 text-right text-slate-400">›</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <Button
                  variant="outline"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1}
                >
                  ← Précédent
                </Button>
                <p className="text-sm text-slate-600">Page {page}</p>
                <Button
                  variant="outline"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={escrows.length < limit}
                >
                  Suivant →
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-4 text-sm text-slate-600">
              <p>Aucun envoi sécurisé pour le moment.</p>
              <Button onClick={() => router.push('/sender/escrows/create')}>Créer un escrow</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-center text-xs text-slate-500">
        Besoin d&apos;aide ? Contactez notre support · FAQ
      </div>
    </div>
  );
}
