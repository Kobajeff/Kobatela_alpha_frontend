'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { isForbiddenError } from '@/lib/apiClient';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { LoadingState } from '@/components/common/LoadingState';
import { formatDateTime } from '@/lib/format';
import { useProviderInboxEscrows } from '@/lib/queries/provider';

const SUMMARY_LIMIT = 5;

export default function ProviderDashboardPage() {
  const { data, isLoading, isError, error } = useProviderInboxEscrows({
    limit: SUMMARY_LIMIT,
    offset: 0
  });

  if (isLoading) {
    return <LoadingState label="Chargement de la boîte de réception..." />;
  }

  if (isError) {
    return (
      <div className="rounded-lg bg-white p-6 shadow">
        <ErrorAlert
          message={
            isForbiddenError(error)
              ? 'Access restricted.'
              : error?.message ?? 'Erreur lors du chargement de la boîte de réception.'
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-lg bg-white p-6 shadow">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Boîte de réception prestataire</h1>
          <p className="text-slate-600">
            Liste des escrows qui requièrent votre intervention pour déposer des preuves.
          </p>
        </div>
        <Link
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          href="/provider/inbox"
        >
          Voir tout
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Escrow ID</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Milestone</th>
              <th className="px-3 py-2">Dernière mise à jour</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data?.items?.length ? (
              data.items.map((item) => (
                <tr key={item.escrow_id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium text-indigo-600">
                    <Link href={`/provider/escrows/${item.escrow_id}` as Route}>
                      {item.escrow_id}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{item.escrow_status}</td>
                  <td className="px-3 py-2">
                    {item.amount_total} {item.currency}
                  </td>
                  <td className="px-3 py-2">
                    {item.current_submittable_milestone_idx ?? '—'}
                  </td>
                  <td className="px-3 py-2">{formatDateTime(item.last_update_at)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-3 py-6 text-center text-slate-500" colSpan={5}>
                  Aucun escrow en attente.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
