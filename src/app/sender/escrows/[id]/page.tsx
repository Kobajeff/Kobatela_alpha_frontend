'use client';

// Detail page for a specific escrow, exposing lifecycle actions.
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { EscrowDetailView } from '@/components/escrows/EscrowDetailView';
import { ProofForm } from '@/components/sender/ProofForm';
import { extractErrorMessage } from '@/lib/apiClient';
import {
  useClientApprove,
  useClientReject,
  useMarkDelivered,
  useProofReviewPolling,
  useSenderEscrowSummary
} from '@/lib/queries/sender';
import { useToast } from '@/components/ui/ToastProvider';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { canAction } from '@/policy/allowedActions';

export default function SenderEscrowDetailsPage() {
  const params = useParams<{ id: string }>();
  const escrowId = params?.id ?? '';
  const query = useSenderEscrowSummary(escrowId);
  const [selectedMilestoneIdx, setSelectedMilestoneIdx] = useState<string>('');
  const [latestProofId, setLatestProofId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const { showToast } = useToast();
  const proofReview = useProofReviewPolling(latestProofId, escrowId, 'sender');

  const markDelivered = useMarkDelivered(escrowId);
  const approve = useClientApprove(escrowId);
  const reject = useClientReject(escrowId);

  useEffect(() => {
    if (!query.data) return;
    if (query.data.milestones.length === 0) return;
    if (selectedMilestoneIdx) return;
    const first = query.data.milestones[0]?.sequence_index;
    if (first !== undefined && first !== null) {
      setSelectedMilestoneIdx(String(first));
    }
  }, [query.data, selectedMilestoneIdx]);

  if (query.isLoading) {
    return <LoadingState label="Chargement de l'escrow..." />;
  }

  if (query.isError) {
    const status = axios.isAxiosError(query.error) ? query.error.response?.status : null;
    const statusMessage = (() => {
      if (status === 403) {
        return "Accès restreint : vous ne pouvez pas consulter ce résumé d'escrow.";
      }
      if (status === 404 || status === 410) {
        return 'Ressource indisponible : cet escrow est introuvable ou archivé.';
      }
      return null;
    })();
    return (
      <div className="p-4">
        <ErrorAlert message={statusMessage ?? extractErrorMessage(query.error)} />
      </div>
    );
  }

  const data = query.data;

  if (!data) {
    return null;
  }

  const viewerContext = data.viewer_context;
  const canMarkDelivered = canAction(viewerContext, 'MARK_DELIVERED');
  const canApprove = canAction(viewerContext, 'CLIENT_APPROVE');
  const canReject = canAction(viewerContext, 'CLIENT_REJECT');
  const canSubmitProof =
    canAction(viewerContext, 'SUBMIT_PROOF') || canAction(viewerContext, 'UPLOAD_PROOF_FILE');
  const actionsDisabled = markDelivered.isPending || approve.isPending || reject.isPending;

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

  const proofForm = canSubmitProof ? (
    <div className="space-y-3 rounded-md border border-slate-100 bg-slate-50 p-4">
      {data.milestones.length === 0 && (
        <p className="text-sm text-amber-700">
          Aucun jalon disponible. La soumission d'une preuve nécessite un jalon.
        </p>
      )}
      {data.milestones.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-slate-700">Associer à un jalon</label>
          <select
            value={selectedMilestoneIdx}
            onChange={(event) => setSelectedMilestoneIdx(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm"
          >
            {data.milestones.map((milestone) => (
              <option key={milestone.id} value={milestone.sequence_index}>
                {milestone.label ?? `Jalon ${milestone.sequence_index}`}
              </option>
            ))}
          </select>
        </div>
      )}
      <ProofForm
        escrowId={escrowId}
        milestoneIdx={
          selectedMilestoneIdx ? Number.parseInt(selectedMilestoneIdx, 10) : undefined
        }
        viewer="sender"
        onProofCreated={setLatestProofId}
      />
    </div>
  ) : null;

  return (
    <div className="space-y-4">
      {actionError && <p className="text-sm text-rose-600">{actionError}</p>}
      <EscrowDetailView
        summary={data}
        portalMode="sender"
        actionsDisabled={actionsDisabled}
        onMarkDelivered={canMarkDelivered ? handleMarkDelivered : undefined}
        onApprove={canApprove ? handleApprove : undefined}
        onReject={canReject ? handleReject : undefined}
        proofReviewActive={proofReview.polling.active}
        proofReviewError={proofReview.polling.errorMessage ?? null}
        proofForm={proofForm}
      />
    </div>
  );
}
