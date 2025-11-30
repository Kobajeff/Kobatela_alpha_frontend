'use client';

// Admin dashboard displaying high-level operational statistics.
import { extractErrorMessage } from '@/lib/apiClient';
import { useAdminDashboard } from '@/lib/queries/admin';
import { Card, CardContent, CardTitle } from '@/components/ui/Card';

export default function AdminDashboardPage() {
  const query = useAdminDashboard();

  if (query.isLoading) {
    return <div className="flex h-full items-center justify-center">Loading...</div>;
  }

  if (query.isError) {
    return (
      <div className="p-4">
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
          <Card key={card.label}>
            <CardContent className="space-y-1">
              <CardTitle className="text-sm font-medium text-slate-500">{card.label}</CardTitle>
              <p className="text-2xl font-semibold text-slate-800">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
