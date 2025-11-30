'use client';

// Detail page for a specific escrow, exposing lifecycle actions.
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { SenderEscrowDetails } from '@/components/sender/SenderEscrowDetails';
import { extractErrorMessage } from '@/lib/apiClient';
import {
  useCheckDeadline,
  useClientApprove,
  useClientReject,
  useMarkDelivered,
  useSenderEscrowSummary
} from '@/lib/queries/sender';

export default function SenderEscrowDetailsPage() {
  const params = useParams<{ id: string }>();
  const escrowId = params?.id ?? '';
  const { data, isLoading, error } = useSenderEscrowSummary(escrowId);
  const [actionError, setActionError] = useState<string | null>(null);

  const markDelivered = useMarkDelivered(escrowId);
  const approve = useClientApprove(escrowId);
  const reject = useClientReject(escrowId);
  const checkDeadline = useCheckDeadline(escrowId);

  const handleAction = async (action: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await action();
    } catch (err) {
      setActionError(extractErrorMessage(err));
    }
  };

  if (isLoading) {
    return <div className="text-slate-600">Chargement de l'escrow...</div>;
  }

  if (error || !data) {
    return <div className="text-rose-600">Impossible de charger cet escrow.</div>;
  }

  const loading =
    markDelivered.isPending || approve.isPending || reject.isPending || checkDeadline.isPending;

  return (
    <div className="space-y-4">
      {actionError && <p className="text-sm text-rose-600">{actionError}</p>}
      <SenderEscrowDetails
        summary={data}
        loading={loading}
        onMarkDelivered={() => handleAction(() => markDelivered.mutateAsync())}
        onApprove={() => handleAction(() => approve.mutateAsync())}
        onReject={() => handleAction(() => reject.mutateAsync())}
        onCheckDeadline={() => handleAction(() => checkDeadline.mutateAsync())}
      />
    </div>
  );
}
