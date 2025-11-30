'use client';

// List component rendering sender escrows in a simple table.
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatDateTime } from '@/lib/format';
import type { EscrowListItem } from '@/types/api';

export function SenderEscrowList({ escrows }: { escrows: EscrowListItem[] }) {
  if (!escrows.length) {
    return <p className="text-slate-600">Aucun escrow trouvé.</p>;
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">ID</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Statut</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Montant</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Créé le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {escrows.map((escrow) => (
                <tr key={escrow.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-indigo-700">
                    <Link href={`/sender/escrows/${escrow.id}`}>{escrow.id}</Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    <StatusBadge type="escrow" status={escrow.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {escrow.amount} {escrow.currency}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">{formatDateTime(escrow.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
