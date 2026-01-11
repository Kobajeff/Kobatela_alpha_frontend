'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { LoadingState } from '@/components/common/LoadingState';
import { EscrowDetailView } from '@/components/escrows/EscrowDetailView';
import { ProofForm } from '@/components/sender/ProofForm';
import { extractErrorMessage } from '@/lib/apiClient';
import { normalizeApiError } from '@/lib/apiError';
import { useProofReviewPolling, useSenderEscrowSummary } from '@/lib/queries/sender';
import { canAction } from '@/policy/allowedActions';

export default function ProviderEscrowDetailsPage() {
  const params = useParams<{ id: string }>();
  const escrowId = params?.id ?? '';
  const query = useSenderEscrowSummary(escrowId, { viewer: 'provider' });
  const [selectedMilestoneIdx, setSelectedMilestoneIdx] = useState<string>('');
  const [latestProofId, setLatestProofId] = useState<string | null>(null);
  const proofReview = useProofReviewPolling(latestProofId, escrowId, 'provider');

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
    return <LoadingState label="Chargement de l'escrow…" />;
  }

  if (query.isError) {
    const status = normalizeApiError(query.error).status;
    const statusMessage = status === 403 ? 'Accès refusé.' : null;
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
  const canSubmitProof =
    canAction(viewerContext, 'SUBMIT_PROOF') || canAction(viewerContext, 'UPLOAD_PROOF_FILE');
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
        viewer="provider"
        onProofCreated={setLatestProofId}
      />
    </div>
  ) : null;

  return (
    <EscrowDetailView
      summary={data}
      portalMode="provider"
      proofForm={proofForm}
      proofReviewActive={proofReview.polling.active}
      proofReviewError={proofReview.polling.errorMessage ?? null}
    />
  );
}
