'use client';

// Detail page for a specific escrow, exposing lifecycle actions.
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { SenderEscrowDetails } from '@/components/sender/SenderEscrowDetails';
import { ProofForm } from '@/components/sender/ProofForm';
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
  const query = useSenderEscrowSummary(escrowId);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>('');

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

  const loading =
    markDelivered.isPending || approve.isPending || reject.isPending || checkDeadline.isPending;

  const proofForm = (
    <div className="space-y-3 rounded-md border border-slate-100 bg-slate-50 p-4">
      {data.milestones.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-slate-700">Associer à un jalon</label>
          <select
            value={selectedMilestoneId}
            onChange={(event) => setSelectedMilestoneId(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm"
          >
            <option value="">Aucun</option>
            {data.milestones.map((milestone) => (
              <option key={milestone.id} value={milestone.id}>
                {milestone.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <ProofForm escrowId={escrowId} milestoneId={selectedMilestoneId || undefined} />
    </div>
  );

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
        proofForm={proofForm}
      />
    </div>
  );
}
