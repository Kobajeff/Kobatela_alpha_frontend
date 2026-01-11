import type { EscrowSummaryViewer } from '@/lib/queryKeys';
import { useProofReviewPolling } from '@/lib/queries/sender';

export function useProof(
  proofId: string | null,
  escrowId: string,
  viewer: EscrowSummaryViewer = 'sender'
) {
  return useProofReviewPolling(proofId, escrowId, viewer);
}
