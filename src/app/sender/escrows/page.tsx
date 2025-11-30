'use client';

// Page showing all escrows for the logged-in sender.
import { SenderEscrowList } from '@/components/sender/SenderEscrowList';
import { useSenderEscrows } from '@/lib/queries/sender';

export default function SenderEscrowsPage() {
  const { data, isLoading, error } = useSenderEscrows();

  if (isLoading) {
    return <div className="text-slate-600">Chargement des escrows...</div>;
  }

  if (error || !data) {
    return <div className="text-rose-600">Impossible de charger les escrows.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Mes escrows</h1>
      </div>
      <SenderEscrowList escrows={data} />
    </div>
  );
}
