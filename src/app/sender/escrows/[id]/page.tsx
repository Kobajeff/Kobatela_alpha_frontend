'use client';

// Detail page for a specific escrow, exposing lifecycle actions.
import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
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
import { useForbiddenAction } from '@/lib/hooks/useForbiddenAction';
import { Button } from '@/components/ui/Button';
import { invalidateEscrowSummary } from '@/lib/queryInvalidation';
import { useQueryClient } from '@tanstack/react-query';

export default function SenderEscrowDetailsPage() {
  const params = useParams<{ id: string }>();
  const escrowId = params?.id ?? '';
  const query = useSenderEscrowSummary(escrowId);
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>('');
  const { showToast } = useToast();
  const { forbidden, forbiddenMessage, forbiddenCode, forbidWith } = useForbiddenAction();

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
      const normalized = forbidWith(err);
      const message = normalized.message ?? extractErrorMessage(err);
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

  const loading =
    markDelivered.isPending || approve.isPending || reject.isPending || checkDeadline.isPending;
  const lastUpdatedAt = query.dataUpdatedAt ? new Date(query.dataUpdatedAt) : null;
  const polling = query.polling;
  const hasProcessing = Boolean(
    polling?.fundingActive || polling?.milestoneActive || polling?.payoutActive
  );
  const refreshSummary = () => invalidateEscrowSummary(queryClient, escrowId);
  const banners = useMemo(
    () =>
      [
        polling?.fundingActive ? 'Traitement PSP' : null,
        polling?.milestoneActive ? 'Mise à jour en cours' : null,
        polling?.payoutActive ? 'Traitement payout' : null
      ].filter((label): label is string => Boolean(label)),
    [polling?.fundingActive, polling?.milestoneActive, polling?.payoutActive]
  );

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
      {banners.map((label) => (
        <div key={label} className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          {label}
        </div>
      ))}
      {polling?.timedOut && (
        <div className="flex flex-col gap-2 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between">
          <span>La mise à jour automatique a été suspendue. Rafraîchissez pour obtenir le dernier statut.</span>
          <Button variant="outline" onClick={refreshSummary}>
            Refresh
          </Button>
        </div>
      )}
      <SenderEscrowDetails
        summary={data}
        loading={loading}
        processing={hasProcessing}
        lastUpdatedAt={lastUpdatedAt}
        onMarkDelivered={handleMarkDelivered}
        onApprove={handleApprove}
        onReject={handleReject}
        onCheckDeadline={() => handleAction(() => checkDeadline.mutateAsync(), 'Escrow updated successfully')}
        forbidden={forbidden}
        forbiddenTitle={forbiddenMessage}
        forbiddenCode={forbiddenCode}
        proofForm={proofForm}
      />
    </div>
  );
}
