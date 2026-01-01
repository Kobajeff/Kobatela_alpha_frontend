import type {
  ExternalEscrowSummary,
  ExternalProofStatus
} from '@/types/api-external';

export function sanitizeExternalEscrowSummary(summary: ExternalEscrowSummary): ExternalEscrowSummary {
  const milestones = (summary.milestones ?? []).map((milestone) => ({
    milestone_idx: milestone.milestone_idx,
    label: milestone.label,
    amount: milestone.amount,
    status: milestone.status,
    requires_proof: milestone.requires_proof,
    last_proof_status: milestone.last_proof_status ?? null
  }));

  return {
    escrow_id: summary.escrow_id,
    status: summary.status,
    currency: summary.currency,
    amount_total: summary.amount_total,
    milestones
  };
}

export function sanitizeExternalProofStatus(status: ExternalProofStatus): ExternalProofStatus {
  return {
    proof_id: status.proof_id,
    status: status.status,
    escrow_id: status.escrow_id,
    milestone_idx: status.milestone_idx,
    terminal: Boolean(status.terminal),
    submitted_at: status.submitted_at,
    reviewed_at: status.reviewed_at ?? null
  };
}
