import type { ProofUI } from '@/types/ui';
import type { UIId } from '@/types/id';

type AdvisorReviewAwareProof = ProofUI & {
  advisor_review_requested_at?: string | null;
  advisor_requested_at?: string | null;
  advisor_review_status?: string | null;
  review_mode?: string | null;
};

const PENDING_PROOF_STATUSES = new Set(['PENDING', 'PENDING_REVIEW']);
const REQUESTED_STATUSES = new Set(['REQUESTED', 'PENDING', 'IN_PROGRESS']);

function normalizeStatus(value: unknown): string | null {
  if (!value || typeof value !== 'string') return null;
  return value.toUpperCase();
}

export function hasAdvisorReviewBeenRequested(
  proof: ProofUI,
  locallyRequestedProofIds?: Set<UIId>
): boolean {
  const typedProof = proof as AdvisorReviewAwareProof;
  const status = normalizeStatus(typedProof.advisor_review_status);
  const reviewMode = typeof typedProof.review_mode === 'string'
    ? typedProof.review_mode.toLowerCase()
    : null;

  return Boolean(
    (locallyRequestedProofIds?.has?.(proof.id) ?? false) ||
      typedProof.advisor_review_requested_at ||
      typedProof.advisor_requested_at ||
      (status && REQUESTED_STATUSES.has(status)) ||
      (reviewMode && reviewMode.includes('advisor'))
  );
}

export function canRequestAdvisorReview(
  proof: ProofUI,
  locallyRequestedProofIds?: Set<UIId>
): boolean {
  const status = normalizeStatus(proof.status);
  const isPending = !status || PENDING_PROOF_STATUSES.has(status);
  return isPending && !hasAdvisorReviewBeenRequested(proof, locallyRequestedProofIds);
}

export function shouldStopAdvisorReviewPolling(
  proof: ProofUI | undefined,
  locallyRequestedProofIds?: Set<UIId>
): boolean {
  if (!proof) return false;
  const status = normalizeStatus(proof.status);
  const isPending = !status || PENDING_PROOF_STATUSES.has(status);

  if (!isPending) return true;
  return hasAdvisorReviewBeenRequested(proof, locallyRequestedProofIds);
}
