'use client';

// Table listing proofs awaiting admin review with action buttons.
import type { AdminProofReviewItemUI } from '@/types/ui';
import type { UIId } from '@/types/id';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatDateTime } from '@/lib/format';
import { ProofAiStatus } from '@/components/sender/ProofAiStatus';

interface AdminProofReviewTableProps {
  items: AdminProofReviewItemUI[];
  onApprove: (id: UIId) => void;
  onReject: (id: UIId) => void;
  processingId?: UIId;
  actionsDisabled?: boolean;
}

export function AdminProofReviewTable({
  items,
  onApprove,
  onReject,
  processingId,
  actionsDisabled = false
}: AdminProofReviewTableProps) {
  const confirmAndApprove = (id: UIId) => {
    if (!window.confirm('Approuver cette preuve ?')) return;
    onApprove(id);
  };

  const confirmAndReject = (id: UIId) => {
    if (!window.confirm('Rejeter cette preuve ?')) return;
    onReject(id);
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-hidden rounded-lg">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Preuve</th>
                <th className="px-4 py-3">Escrow</th>
                <th className="px-4 py-3">Jalon</th>
                <th className="px-4 py-3">Advisor</th>
                <th className="px-4 py-3">Créée</th>
                <th className="px-4 py-3">Analyse IA</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {items.map((item) => (
                <tr key={item.proof_id}>
                  <td className="px-4 py-3 font-medium text-slate-800">{item.proof_id}</td>
                  <td className="px-4 py-3 text-slate-700">{item.escrow_id}</td>
                  <td className="px-4 py-3 text-slate-700">{item.milestone_id ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {item.advisor
                      ? `${item.advisor.first_name} ${item.advisor.last_name}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDateTime(item.created_at)}</td>
                  <td className="px-4 py-3 text-slate-700">
                    <ProofAiStatus proof={item} compact />
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <StatusBadge type="proof" status={item.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={processingId === item.proof_id || actionsDisabled}
                        onClick={() => confirmAndApprove(item.proof_id)}
                      >
                        Approuver
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="danger"
                        disabled={processingId === item.proof_id || actionsDisabled}
                        onClick={() => confirmAndReject(item.proof_id)}
                      >
                        Rejeter
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
