'use client';

// Admin dashboard displaying high-level operational statistics.
import { extractErrorMessage } from '@/lib/apiClient';
import { useAdminDashboardStatsComputed } from '@/lib/queries/admin';
import { Card, CardContent, CardTitle } from '@/components/ui/Card';
import { AdminUserCreator } from '@/components/admin/AdminUserCreator';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorAlert } from '@/components/common/ErrorAlert';

export default function AdminDashboardPage() {
  const query = useAdminDashboardStatsComputed();

  if (query.isLoading) {
    return <LoadingState label="Chargement du tableau de bord admin..." />;
  }

  if (query.isError) {
    return (
      <div className="p-4">
        <ErrorAlert message={extractErrorMessage(query.error)} />
      </div>
    );
  }

  const data = query.data;

  if (!data) {
    return null;
  }

  const cards = [
    data.total_escrows !== null
      ? { label: 'Total escrows', value: data.total_escrows }
      : null,
    data.pending_proofs !== null
      ? { label: 'Preuves en attente', value: data.pending_proofs }
      : null,
    data.approved_proofs !== null
      ? { label: 'Preuves approuvées', value: data.approved_proofs }
      : null,
    data.rejected_proofs !== null
      ? { label: 'Preuves rejetées', value: data.rejected_proofs }
      : null,
    data.total_payments !== null
      ? { label: 'Paiements totaux', value: data.total_payments }
      : null
  ].filter((card): card is { label: string; value: number } => Boolean(card));

  const showAccessDenied =
    data.access.escrowsDenied ||
    data.access.paymentsDenied ||
    data.access.proofsDenied;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-800">Tableau de bord admin</h1>
      {showAccessDenied && (
        <p className="text-sm text-slate-500">Action non autorisée</p>
      )}
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
      <AdminUserCreator />
    </div>
  );
}
