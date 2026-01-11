'use client';

// Sender dashboard page summarizing key metrics and activity.
import { extractErrorMessage } from '@/lib/apiClient';
import { useSenderDashboard } from '@/lib/queries/sender';
import { SenderEscrowList } from '@/components/sender/SenderEscrowList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatDateTime } from '@/lib/format';
import { MyAdvisorCard } from '@/components/sender/MyAdvisorCard';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorAlert } from '@/components/common/ErrorAlert';

export default function SenderDashboardPage() {
  const { data, isLoading, isError, error } = useSenderDashboard?.() ?? {};

  const recentEscrows = data?.recent_escrows ?? [];
  const pendingProofs = data?.pending_proofs ?? [];
  const recentPayments = data?.recent_payments ?? [];

  if (isLoading) {
    return <LoadingState label="Chargement du tableau de bord..." />;
  }

  if (isError) {
    return (
      <div className="h-full p-4">
        <ErrorAlert message={extractErrorMessage(error)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <MyAdvisorCard />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="space-y-1">
            <CardTitle className="text-sm font-medium text-slate-500">Escrows récents</CardTitle>
            <p className="text-2xl font-semibold">{recentEscrows.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1">
            <CardTitle className="text-sm font-medium text-slate-500">Preuves en attente</CardTitle>
            <p className="text-2xl font-semibold">{pendingProofs.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1">
            <CardTitle className="text-sm font-medium text-slate-500">Paiements récents</CardTitle>
            <p className="text-2xl font-semibold">{recentPayments.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Escrows récents</CardTitle>
        </CardHeader>
        <CardContent>
          <SenderEscrowList escrows={recentEscrows} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Preuves en attente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingProofs.length === 0 && <p className="text-slate-600">Aucune preuve en attente.</p>}
          {pendingProofs.map((proof) => (
            <div key={proof.id} className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2">
              <div>
                <p className="font-medium">Preuve {proof.id}</p>
                <p className="text-xs text-slate-500">Escrow {proof.escrow_id}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <StatusBadge type="proof" status={proof.status} />
                <span>{formatDateTime(proof.created_at)}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Paiements récents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentPayments.length === 0 && <p className="text-slate-600">Aucun paiement récent.</p>}
          {recentPayments.map((payment) => (
            <div key={payment.id} className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2">
              <div>
                <p className="font-medium">{payment.amount}</p>
                <p className="text-xs text-slate-500">Escrow {payment.escrow_id}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <StatusBadge type="payment" status={payment.status} />
                <span>{formatDateTime(payment.created_at)}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
