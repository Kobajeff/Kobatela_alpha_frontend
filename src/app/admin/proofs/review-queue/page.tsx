'use client';

// Admin page to review proofs and approve or reject them.
import { useState } from 'react';
import axios from 'axios';
import { AdminProofReviewTable } from '@/components/admin/AdminProofReviewTable';
import { extractErrorMessage } from '@/lib/apiClient';
import { useAdminProofDecision, useAdminProofReviewQueue } from '@/lib/queries/admin';
import { useToast } from '@/components/ui/ToastProvider';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorAlert } from '@/components/common/ErrorAlert';

export default function AdminProofReviewQueuePage() {
  const query = useAdminProofReviewQueue();
  const decision = useAdminProofDecision();
  const [processingId, setProcessingId] = useState<string | undefined>();
  const [actionError, setActionError] = useState('');
  const { showToast } = useToast();

  const getDecisionErrorMessage = (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 403) return 'Insufficient scope';
      if (status === 404 || status === 405) return 'Endpoint not available';
    }

    return extractErrorMessage(error);
  };

  const handleApprove = async (proofId: string) => {
    setProcessingId(proofId);
    setActionError('');
    try {
      await decision.mutateAsync({ proofId, payload: { decision: 'approve' } });
      showToast('Proof updated successfully', 'success');
    } catch (err) {
      const message = getDecisionErrorMessage(err);
      setActionError(message);
      showToast(message, 'error');
    } finally {
      setProcessingId(undefined);
    }
  };

  const handleReject = async (proofId: string) => {
    setProcessingId(proofId);
    setActionError('');
    try {
      await decision.mutateAsync({ proofId, payload: { decision: 'reject' } });
      showToast('Proof updated successfully', 'success');
    } catch (err) {
      const message = getDecisionErrorMessage(err);
      setActionError(message);
      showToast(message, 'error');
    } finally {
      setProcessingId(undefined);
    }
  };

  if (query.isLoading) {
    return <LoadingState label="Chargement de la file de preuves..." />;
  }

  if (query.isError) {
    return (
      <div className="p-4">
        <ErrorAlert message={extractErrorMessage(query.error)} />
      </div>
    );
  }

  const data = query.data;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">File d'approbation des preuves</h1>
        {actionError && <p className="text-sm text-rose-600">{actionError}</p>}
      </div>
      {data && data.length > 0 ? (
        <AdminProofReviewTable
          items={data}
          onApprove={handleApprove}
          onReject={handleReject}
          processingId={processingId}
        />
      ) : (
        <div className="rounded-md border border-slate-200 bg-white p-4 text-slate-600">Aucune preuve en attente.</div>
      )}
    </div>
  );
}
