'use client';

// Table listing proofs awaiting admin review with action buttons.
import type { AdminProofReviewItem } from '@/types/api';

interface AdminProofReviewTableProps {
  items: AdminProofReviewItem[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  processingId?: string;
}

export function AdminProofReviewTable({ items, onApprove, onReject, processingId }: AdminProofReviewTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
          <tr>
            <th className="px-4 py-3">Preuve</th>
            <th className="px-4 py-3">Escrow</th>
            <th className="px-4 py-3">Jalon</th>
            <th className="px-4 py-3">Sender</th>
            <th className="px-4 py-3">Créée</th>
            <th className="px-4 py-3">Statut</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {items.map((item) => (
            <tr key={item.id}>
              <td className="px-4 py-3 font-medium text-slate-800">{item.id}</td>
              <td className="px-4 py-3 text-slate-700">{item.escrow_id}</td>
              <td className="px-4 py-3 text-slate-700">{item.milestone_name ?? '—'}</td>
              <td className="px-4 py-3 text-slate-700">{item.sender_email ?? '—'}</td>
              <td className="px-4 py-3 text-slate-600">{new Date(item.created_at).toLocaleString()}</td>
              <td className="px-4 py-3 text-slate-700">{item.status}</td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    disabled={processingId === item.id}
                    onClick={() => onApprove(item.id)}
                    className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    Approuver
                  </button>
                  <button
                    type="button"
                    disabled={processingId === item.id}
                    onClick={() => onReject(item.id)}
                    className="rounded-md bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
                  >
                    Rejeter
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
