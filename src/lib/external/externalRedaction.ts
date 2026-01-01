import type { ExternalEscrowSummary, ExternalProofStatus, ExternalProofSubmitResponse } from '@/types/api-external';

export function redactExternalEscrowSummary(summary: ExternalEscrowSummary): ExternalEscrowSummary {
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

export function redactExternalProofResponse(
  proof: ExternalProofStatus | ExternalProofSubmitResponse
): ExternalProofStatus | ExternalProofSubmitResponse {
  return {
    proof_id: proof.proof_id,
    status: proof.status,
    escrow_id: proof.escrow_id,
    milestone_idx: proof.milestone_idx,
    // Keep submitted_at/reviewed_at when present but drop any storage details if ever added in future responses.
    ...(proof as ExternalProofStatus).submitted_at
      ? { submitted_at: (proof as ExternalProofStatus).submitted_at }
      : {},
    ...(proof as ExternalProofStatus).reviewed_at !== undefined
      ? { reviewed_at: (proof as ExternalProofStatus).reviewed_at ?? null }
      : {},
    ...(proof as ExternalProofSubmitResponse).created_at
      ? { created_at: (proof as ExternalProofSubmitResponse).created_at }
      : {},
    terminal: (proof as ExternalProofStatus).terminal ?? false
  } as ExternalProofStatus | ExternalProofSubmitResponse;
}
