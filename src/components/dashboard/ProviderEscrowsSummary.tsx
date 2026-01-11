"use client";

import Link from 'next/link';
import type { Route } from 'next';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatDateTime } from '@/lib/format';
import type { ProviderInboxItemRead } from '@/types/api';

type ProviderEscrowsSummaryProps = {
  items: ProviderInboxItemRead[];
};

export function ProviderEscrowsSummary({ items }: ProviderEscrowsSummaryProps) {
  if (!items.length) {
    return <p className="text-slate-600">Aucun escrow prestataire récent.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
          <tr>
            <th className="px-3 py-2">Escrow ID</th>
            <th className="px-3 py-2">Statut</th>
            <th className="px-3 py-2">Montant</th>
            <th className="px-3 py-2">Milestone</th>
            <th className="px-3 py-2">Mis à jour</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item) => (
            <tr key={item.escrow_id} className="hover:bg-slate-50">
              <td className="px-3 py-2 font-medium text-indigo-600">
                <Link href={`/provider/escrows/${item.escrow_id}` as Route}>
                  {item.escrow_id}
                </Link>
              </td>
              <td className="px-3 py-2">
                <StatusBadge type="escrow" status={item.escrow_status} />
              </td>
              <td className="px-3 py-2">
                {item.amount_total} {item.currency}
              </td>
              <td className="px-3 py-2">{item.current_submittable_milestone_idx ?? '—'}</td>
              <td className="px-3 py-2 text-slate-500">{formatDateTime(item.last_update_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
