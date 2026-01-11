'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { LoadingState } from '@/components/common/LoadingState';
import { formatDateTime } from '@/lib/format';
import { useProviderInboxEscrows } from '@/lib/queries/provider';

const DEFAULT_LIMIT = 20;

export default function ProviderDashboardPage() {
  const [limit] = useState(DEFAULT_LIMIT);
  const [offset, setOffset] = useState(0);
  const { data, isLoading, isError, error } = useProviderInboxEscrows({ limit, offset });

  const total = data?.total ?? 0;
  const maxOffset = Math.max(total - limit, 0);
  const canPrevious = offset > 0;
  const canNext = offset + limit < total;
  const pageLabel = useMemo(() => {
    if (!total) return '0';
    const start = offset + 1;
    const end = Math.min(offset + limit, total);
    return `${start}-${end} / ${total}`;
  }, [limit, offset, total]);

  if (isLoading) {
    return <LoadingState label="Chargement de la boîte de réception..." />;
  }

  if (isError) {
    return (
      <div className="rounded-lg bg-white p-6 shadow">
        <ErrorAlert message={error?.message ?? 'Erreur lors du chargement de la boîte de réception.'} />
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-lg bg-white p-6 shadow">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Boîte de réception prestataire</h1>
        <p className="text-slate-600">
          Liste des escrows qui requièrent votre intervention pour déposer des preuves.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Escrow ID</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Sender</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Deadline</th>
              <th className="px-3 py-2">Milestone</th>
              <th className="px-3 py-2">Required proof</th>
              <th className="px-3 py-2">Last update</th>
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
                  <td className="px-3 py-2">{item.sender_display}</td>
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
                    {item.required_proof_kinds.length > 0
                      ? item.required_proof_kinds.join(', ')
                      : '—'}
                  </td>
                  <td className="px-3 py-2">{formatDateTime(item.last_update_at)}</td>
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

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
        <span>{pageLabel}</span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={!canPrevious}
            onClick={() => setOffset((prev) => Math.max(prev - limit, 0))}
          >
            Précédent
          </Button>
          <Button
            variant="outline"
            disabled={!canNext}
            onClick={() => setOffset((prev) => Math.min(prev + limit, maxOffset))}
          >
            Suivant
          </Button>
        </div>
      </div>
    </div>
  );
}
