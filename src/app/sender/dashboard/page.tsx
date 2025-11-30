'use client';

// Sender dashboard page summarizing key metrics and activity.
import { extractErrorMessage } from '@/lib/apiClient';
import { useSenderDashboard } from '@/lib/queries/sender';
import { SenderEscrowList } from '@/components/sender/SenderEscrowList';

export default function SenderDashboardPage() {
  const query = useSenderDashboard();

  if (query.isLoading) {
    return <div className="flex h-full items-center justify-center">Loading...</div>;
  }

  if (query.isError) {
    return (
      <div className="h-full p-4">
        <div className="my-4 rounded bg-red-100 p-4 text-red-700">
          {extractErrorMessage(query.error)}
        </div>
      </div>
    );
  }

  const data = query.data;

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Escrows récents</p>
          <p className="text-2xl font-semibold">{data.recentEscrows.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Preuves en attente</p>
          <p className="text-2xl font-semibold">{data.pendingProofs.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Paiements récents</p>
          <p className="text-2xl font-semibold">{data.recentPayments.length}</p>
        </div>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Escrows récents</h2>
        <SenderEscrowList escrows={data.recentEscrows} />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Preuves en attente</h2>
        <div className="space-y-3">
          {data.pendingProofs.length === 0 && <p className="text-slate-600">Aucune preuve en attente.</p>}
          {data.pendingProofs.map((proof) => (
            <div key={proof.id} className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2">
              <div>
                <p className="font-medium">Preuve {proof.id}</p>
                <p className="text-xs text-slate-500">Escrow {proof.escrow_id}</p>
              </div>
              <span className="text-xs text-slate-500">{new Date(proof.created_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Paiements récents</h2>
        <div className="space-y-3">
          {data.recentPayments.length === 0 && <p className="text-slate-600">Aucun paiement récent.</p>}
          {data.recentPayments.map((payment) => (
            <div key={payment.id} className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2">
              <div>
                <p className="font-medium">{payment.amount} {payment.currency}</p>
                <p className="text-xs text-slate-500">Escrow {payment.escrow_id}</p>
              </div>
              <span className="text-xs text-slate-500">{new Date(payment.created_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
