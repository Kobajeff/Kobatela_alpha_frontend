'use client';

// Admin page to review proofs and approve or reject them.
import { useState } from 'react';
import { AdminProofReviewTable } from '@/components/admin/AdminProofReviewTable';
import { extractErrorMessage } from '@/lib/apiClient';
import { useAdminApproveProof, useAdminProofReviewQueue, useAdminRejectProof } from '@/lib/queries/admin';

export default function AdminProofReviewQueuePage() {
  const query = useAdminProofReviewQueue();
  const approve = useAdminApproveProof();
  const reject = useAdminRejectProof();
  const [processingId, setProcessingId] = useState<string | undefined>();
  const [actionError, setActionError] = useState('');

  const handleApprove = async (proofId: string) => {
    setProcessingId(proofId);
    setActionError('');
    try {
      await approve.mutateAsync(proofId);
    } catch (err) {
      setActionError(extractErrorMessage(err));
    } finally {
      setProcessingId(undefined);
    }
  };

  const handleReject = async (proofId: string) => {
    setProcessingId(proofId);
    setActionError('');
    try {
      await reject.mutateAsync(proofId);
    } catch (err) {
      setActionError(extractErrorMessage(err));
    } finally {
      setProcessingId(undefined);
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
