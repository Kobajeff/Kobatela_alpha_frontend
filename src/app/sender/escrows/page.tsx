'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { extractErrorMessage } from '@/lib/apiClient';
import { useSenderEscrows } from '@/lib/queries/sender';
import { useProviderInboxEscrows } from '@/lib/queries/provider';
import { formatDateTime } from '@/lib/format';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import type { EscrowStatus } from '@/types/api';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { StatusBadge } from '@/components/common/StatusBadge';

function getEscrowStatus(item: { status?: string; escrow_status?: string }): string | undefined {
  if ('status' in item) return item.status;
  return item.escrow_status;
}

const STATUS_OPTIONS: { label: string; value: '' | EscrowStatus }[] = [
  { label: 'Tous les statuts', value: '' },
  { label: 'Brouillon', value: 'DRAFT' },
  { label: 'Actif', value: 'ACTIVE' },
  { label: 'Financé', value: 'FUNDED' },
  { label: 'Prêt à libérer', value: 'RELEASABLE' },
  { label: 'Libéré', value: 'RELEASED' },
  { label: 'Remboursé', value: 'REFUNDED' },
  { label: 'Annulé', value: 'CANCELLED' }
];

export default function SenderEscrowsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'' | EscrowStatus>('');
  const [page, setPage] = useState(1);
  const [providerOffset, setProviderOffset] = useState(0);
  const limit = 10;
  const providerLimit = 10;

  useEffect(() => {
    setPage(1);
  }, [status]);

  const offset = useMemo(() => (page - 1) * limit, [page, limit]);
  const senderQuery = useSenderEscrows({ status: status || undefined, limit, offset });
  const providerQuery = useProviderInboxEscrows({ limit: providerLimit, offset: providerOffset });
  const providerItems = useMemo(() => providerQuery.data?.items ?? [], [providerQuery.data?.items]);
  const providerTotal = providerQuery.data?.total ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Mes escrows</h1>
          <p className="text-sm text-slate-600">
            Vue unifiée de vos escrows, en tant qu&apos;expéditeur ou prestataire.
          </p>
        </div>
        <Button onClick={() => router.push('/sender/escrows/create')}>Créer un escrow</Button>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">En tant qu&apos;expéditeur</CardTitle>
            <p className="text-sm text-slate-500">
              Source: <span className="font-medium">GET /escrows?mine=true</span>
            </p>
          </div>
          <div className="w-full max-w-xs">
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
        </CardHeader>
        <CardContent>
          {senderQuery.isLoading ? (
            <LoadingState label="Chargement des escrows expéditeur..." fullHeight={false} />
          ) : senderQuery.isError ? (
            <ErrorAlert message={extractErrorMessage(senderQuery.error)} />
          ) : senderQuery.data?.length ? (
            <>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Escrow ID</th>
                      <th className="px-3 py-2">Statut</th>
                      <th className="px-3 py-2">Montant</th>
                      <th className="px-3 py-2">Créé le</th>
                      <th className="px-3 py-2">Échéance</th>
                      <th className="px-3 py-2">Accès</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {senderQuery.data.map((escrow) => (
                      <tr key={escrow.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium text-indigo-600">
                          <Link href={`/sender/escrows/${escrow.id}`}>{escrow.id}</Link>
                        </td>
                        <td className="px-3 py-2">
                          <StatusBadge type="escrow" status={escrow.status} />
                        </td>
                        <td className="px-3 py-2">
                          {escrow.amount_total} {escrow.currency}
                        </td>
                        <td className="px-3 py-2 text-slate-500">
                          {formatDateTime(escrow.created_at)}
                        </td>
                        <td className="px-3 py-2 text-slate-500">
                          {escrow.deadline_at ? formatDateTime(escrow.deadline_at) : '—'}
                        </td>
                        <td className="px-3 py-2">
                          <Link
                            className="font-medium text-indigo-600 hover:text-indigo-500"
                            href={`/sender/escrows/${escrow.id}`}
                          >
                            Ouvrir
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1}
                >
                  Précédent
                </Button>
                <p className="text-sm text-slate-600">Page {page}</p>
                <Button
                  variant="outline"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={(senderQuery.data?.length ?? 0) < limit}
                >
                  Suivant
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-600">Aucun escrow expéditeur trouvé.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg">En tant que prestataire</CardTitle>
          <p className="text-sm text-slate-500">
            Source: <span className="font-medium">GET /provider/inbox/escrows</span>
          </p>
        </CardHeader>
        <CardContent>
          {providerQuery.isLoading ? (
            <LoadingState label="Chargement de la boîte de réception prestataire..." fullHeight={false} />
          ) : providerQuery.isError ? (
            <ErrorAlert message={extractErrorMessage(providerQuery.error)} />
          ) : providerItems.length ? (
            <>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Expéditeur</th>
                      <th className="px-3 py-2">Escrow ID</th>
                      <th className="px-3 py-2">Statut</th>
                      <th className="px-3 py-2">Montant</th>
                      <th className="px-3 py-2">Échéance</th>
                      <th className="px-3 py-2">Dernière mise à jour</th>
                      <th className="px-3 py-2">Alerte</th>
                      <th className="px-3 py-2">Accès</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {providerItems.map((item) => {
                      const status = getEscrowStatus(item);
                      return (
                        <tr key={item.escrow_id} className="hover:bg-slate-50">
                          <td className="px-3 py-2">
                            <span className="font-medium text-slate-700">{item.sender_display}</span>
                          </td>
                          <td className="px-3 py-2 font-medium text-indigo-600">
                            <Link href={`/provider/escrows/${item.escrow_id}`}>{item.escrow_id}</Link>
                          </td>
                          <td className="px-3 py-2">
                            {status ? <StatusBadge type="escrow" status={status} /> : <span>—</span>}
                          </td>
                          <td className="px-3 py-2">
                            {item.amount_total} {item.currency}
                          </td>
                          <td className="px-3 py-2 text-slate-500">
                            {item.deadline_at ? formatDateTime(item.deadline_at) : '—'}
                          </td>
                          <td className="px-3 py-2 text-slate-500">
                            {formatDateTime(item.last_update_at)}
                          </td>
                          <td className="px-3 py-2">
                            {item.current_submittable_milestone_idx !== null ? (
                              <Badge variant="warning">Action requise</Badge>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <Link
                              className="font-medium text-indigo-600 hover:text-indigo-500"
                              href={`/provider/escrows/${item.escrow_id}`}
                            >
                              Ouvrir
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() => setProviderOffset((current) => Math.max(0, current - providerLimit))}
                  disabled={providerOffset === 0}
                >
                  Précédent
                </Button>
                <p className="text-sm text-slate-600">
                  {providerTotal
                    ? `${providerOffset + 1}–${Math.min(
                        providerOffset + providerItems.length,
                        providerTotal
                      )} sur ${providerTotal}`
                    : `Page ${Math.floor(providerOffset / providerLimit) + 1}`}
                </p>
                <Button
                  variant="outline"
                  onClick={() => setProviderOffset((current) => current + providerLimit)}
                  disabled={
                    providerItems.length < providerLimit ||
                    (providerTotal > 0 && providerOffset + providerLimit >= providerTotal)
                  }
                >
                  Suivant
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-600">Aucun escrow prestataire trouvé.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
