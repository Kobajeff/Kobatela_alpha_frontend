'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { LoadingState } from '@/components/common/LoadingState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { OpsPagination } from '@/components/admin/OpsPagination';
import { isForbiddenError } from '@/lib/apiClient';
import { formatDateTime } from '@/lib/format';
import { useProviderInboxEscrows } from '@/lib/queries/provider';

const PAGE_LIMIT = 20;

export default function ProviderInboxPage() {
  const [offset, setOffset] = useState(0);
  const query = useProviderInboxEscrows({ limit: PAGE_LIMIT, offset });

  const data = query.data;
  const items = useMemo(() => data?.items ?? [], [data]);
  const resolvedLimit = data?.limit ?? PAGE_LIMIT;
  const resolvedOffset = data?.offset ?? offset;

  if (query.isLoading) {
    return <LoadingState label="Chargement de la boîte de réception..." />;
  }

  if (query.isError) {
    return (
      <div className="rounded-lg bg-white p-6 shadow">
        <ErrorAlert
          message={
            isForbiddenError(query.error)
              ? 'Access restricted.'
              : query.error?.message ?? 'Erreur lors du chargement de la boîte de réception.'
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-lg bg-white p-6 shadow">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Boîte de réception prestataire</h1>
        <p className="text-slate-600">
          Tous les escrows où vous êtes prestataire, avec les exigences de preuve associées.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Escrow ID</th>
              <th className="px-3 py-2">Expéditeur</th>
              <th className="px-3 py-2">Statut</th>
              <th className="px-3 py-2">Montant</th>
              <th className="px-3 py-2">Échéance</th>
              <th className="px-3 py-2">Milestone</th>
              <th className="px-3 py-2">Preuves requises</th>
              <th className="px-3 py-2">Dernière mise à jour</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length ? (
              items.map((item) => (
                <tr key={item.escrow_id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium text-indigo-600">
                    <Link href={`/provider/escrows/${item.escrow_id}` as Route}>
                      {item.escrow_id}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{item.sender_display}</td>
                  <td className="px-3 py-2">
                    <StatusBadge type="escrow" status={item.escrow_status} />
                  </td>
                  <td className="px-3 py-2">
                    {item.amount_total} {item.currency}
                  </td>
                  <td className="px-3 py-2">
                    {item.deadline_at ? formatDateTime(item.deadline_at) : '—'}
                  </td>
                  <td className="px-3 py-2">
                    {item.current_submittable_milestone_idx ?? '—'}
                  </td>
                  <td className="px-3 py-2">
                    {item.required_proof_kinds.length
                      ? item.required_proof_kinds.join(', ')
                      : '—'}
                  </td>
                  <td className="px-3 py-2 text-slate-500">
                    {formatDateTime(item.last_update_at)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-3 py-6 text-center text-slate-500" colSpan={8}>
                  Aucun escrow en attente.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <OpsPagination
        limit={resolvedLimit}
        offset={resolvedOffset}
        total={data?.total}
        pageItemCount={items.length}
        onPrev={() => setOffset((current) => Math.max(0, current - resolvedLimit))}
        onNext={() => setOffset((current) => current + resolvedLimit)}
      />
    </div>
  );
}
