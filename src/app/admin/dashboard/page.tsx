'use client';

// Admin dashboard displaying high-level operational statistics.
import { useAdminDashboard } from '@/lib/queries/admin';
import { extractErrorMessage } from '@/lib/apiClient';

export default function AdminDashboardPage() {
  const { data, isLoading, error } = useAdminDashboard();

  if (isLoading) {
    return <div className="text-slate-600">Chargement du tableau de bord...</div>;
  }

  if (error) {
    return <div className="text-rose-600">{extractErrorMessage(error)}</div>;
  }

  if (!data) {
    return null;
  }

  const cards = [
    { label: 'Total escrows', value: data.total_escrows },
    { label: 'Preuves en attente', value: data.pending_proofs },
    { label: 'Preuves approuvées', value: data.approved_proofs },
    { label: 'Preuves rejetées', value: data.rejected_proofs },
    { label: 'Paiements totaux', value: data.total_payments }
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-800">Tableau de bord admin</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="text-2xl font-semibold text-slate-800">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
