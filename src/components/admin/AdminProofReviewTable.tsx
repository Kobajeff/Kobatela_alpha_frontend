'use client';

// Table listing proofs awaiting admin review with action buttons.
import type { AdminProofReviewItem } from '@/types/api';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Badge } from '@/components/ui/Badge';
import { formatDateTime } from '@/lib/format';

interface AdminProofReviewTableProps {
  items: AdminProofReviewItem[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  processingId?: string;
}

export function AdminProofReviewTable({ items, onApprove, onReject, processingId }: AdminProofReviewTableProps) {
  const confirmAndApprove = (id: string) => {
    if (!window.confirm('Approuver cette preuve ?')) return;
    onApprove(id);
  };

  const confirmAndReject = (id: string) => {
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
                <th className="px-4 py-3">Sender</th>
                <th className="px-4 py-3">Créée</th>
                <th className="px-4 py-3">Analyse IA</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">AI</th>
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
                  <td className="px-4 py-3 text-slate-600">{formatDateTime(item.created_at)}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {item.ai_checked_at ? (
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant={
                              item.ai_risk_level === 'LOW'
                                ? 'success'
                                : item.ai_risk_level === 'MEDIUM'
                                  ? 'warning'
                                  : item.ai_risk_level === 'HIGH'
                                    ? 'destructive'
                                    : 'default'
                            }
                          >
                            AI risk: {item.ai_risk_level ?? 'UNKNOWN'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(item.ai_checked_at)}
                          </span>
                        </div>
                        {item.ai_explanation && (
                          <p className="text-xs text-muted-foreground">{item.ai_explanation}</p>
                        )}
                        {item.ai_flags && item.ai_flags.length > 0 && (
                          <p className="text-xs text-muted-foreground">Flags: {item.ai_flags.join(', ')}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Analyse IA en attente</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <StatusBadge type="proof" status={item.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <ProofAiStatus proof={item} compact />
                    {item.ai_flags && item.ai_flags.length > 0 && (
                      <ul className="mt-1 space-y-0.5 text-[10px] text-muted-foreground">
                        {item.ai_flags.map((flag) => (
                          <li key={flag}>• {flag}</li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={processingId === item.id}
                        onClick={() => confirmAndApprove(item.id)}
                      >
                        Approuver
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="danger"
                        disabled={processingId === item.id}
                        onClick={() => confirmAndReject(item.id)}
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
