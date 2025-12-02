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
import { useToast } from '@/components/ui/ToastProvider';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorAlert } from '@/components/common/ErrorAlert';

export default function SenderEscrowDetailsPage() {
  const params = useParams<{ id: string }>();
  const escrowId = params?.id ?? '';
  const query = useSenderEscrowSummary(escrowId);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>('');
  const { showToast } = useToast();

  const markDelivered = useMarkDelivered(escrowId);
  const approve = useClientApprove(escrowId);
  const reject = useClientReject(escrowId);
  const checkDeadline = useCheckDeadline(escrowId);

  const handleAction = async (action: () => Promise<unknown>, successMessage: string) => {
    setActionError(null);
    try {
      await action();
      showToast(successMessage, 'success');
    } catch (err) {
      const message = extractErrorMessage(err);
      setActionError(message);
      showToast(message, 'error');
    }
  };

  const handleMarkDelivered = () => {
    if (!window.confirm('Are you sure you want to mark this escrow as delivered?')) return;
    return handleAction(() => markDelivered.mutateAsync(), 'Escrow updated successfully');
  };

  const handleApprove = () => {
    if (!window.confirm('Are you sure you want to approve this escrow?')) return;
    return handleAction(() => approve.mutateAsync(), 'Escrow updated successfully');
  };

  const handleReject = () => {
    if (!window.confirm('Are you sure you want to reject this escrow?')) return;
    return handleAction(() => reject.mutateAsync(), 'Escrow updated successfully');
  };

  if (query.isLoading) {
    return <LoadingState label="Chargement de l'escrow..." />;
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
        onMarkDelivered={handleMarkDelivered}
        onApprove={handleApprove}
        onReject={handleReject}
        onCheckDeadline={() => handleAction(() => checkDeadline.mutateAsync(), 'Escrow updated successfully')}
        proofForm={proofForm}
      />
    </div>
  );
}
