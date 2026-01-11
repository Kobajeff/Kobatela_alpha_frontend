"use client";

import Link from 'next/link';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatDateTime } from '@/lib/format';
import type { EscrowListItem } from '@/types/api';

type SenderEscrowsSummaryProps = {
  escrows: EscrowListItem[];
};

export function SenderEscrowsSummary({ escrows }: SenderEscrowsSummaryProps) {
  if (!escrows.length) {
    return <p className="text-slate-600">Aucun escrow expéditeur récent.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
          <tr>
            <th className="px-3 py-2">Escrow ID</th>
            <th className="px-3 py-2">Statut</th>
            <th className="px-3 py-2">Montant</th>
            <th className="px-3 py-2">Créé le</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {escrows.map((escrow) => (
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
              <td className="px-3 py-2 text-slate-500">{formatDateTime(escrow.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
