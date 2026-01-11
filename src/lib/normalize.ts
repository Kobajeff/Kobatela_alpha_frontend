import type {
  AdminEscrowSummary,
  AdminProofReviewItem,
  AdvisorProofItem,
  EscrowListItem,
  EscrowRead,
  EscrowViewerContext,
  Milestone,
  Payment,
  Proof,
  ProviderInboxItemRead,
  ProviderInboxResponse,
  SenderDashboard,
  SenderEscrowSummary,
  ExternalProofToken,
  ExternalProofTokenListResponse,
  ExternalProofTokenTarget,
  InflationAdjustment,
  InflationAdjustmentListResponse
} from '@/types/api';
import type {
  ExternalProofStatus,
  ExternalProofSubmitResponse,
  ExternalProofUploadResponse
} from '@/types/api-external';
import type {
  AdminEscrowSummaryUI,
  AdminProofReviewItemUI,
  AdvisorProofItemUI,
  EscrowListItemUI,
  EscrowReadUI,
  EscrowViewerContextUI,
  ExternalProofStatusUI,
  ExternalProofSubmitResponseUI,
  ExternalProofUploadResponseUI,
  ExternalProofTokenListResponseUI,
  ExternalProofTokenTargetUI,
  ExternalProofTokenUI,
  MilestoneUI,
  PaymentUI,
  ProofUI,
  ProviderInboxItemReadUI,
  ProviderInboxResponseUI,
  SenderDashboardUI,
  SenderEscrowSummaryUI,
  InflationAdjustmentUI,
  InflationAdjustmentListResponseUI
} from '@/types/ui';
import { normalizeOptionalId, toUIId } from '@/lib/id';

export function normalizeEscrowListItem(item: EscrowListItem): EscrowListItemUI {
  return {
    ...item,
    id: toUIId(item.id),
    provider_user_id: normalizeOptionalId(item.provider_user_id),
    beneficiary_id: normalizeOptionalId(item.beneficiary_id),
    beneficiary_profile_id: normalizeOptionalId(item.beneficiary_profile_id),
    client_id: normalizeOptionalId(item.client_id),
    provider_id: normalizeOptionalId(item.provider_id)
  };
}

export function normalizeEscrowRead(escrow: EscrowRead): EscrowReadUI {
  return {
    ...escrow,
    id: toUIId(escrow.id),
    client_id: normalizeOptionalId(escrow.client_id),
    provider_user_id: normalizeOptionalId(escrow.provider_user_id),
    provider_id: normalizeOptionalId(escrow.provider_id),
    beneficiary_id: normalizeOptionalId(escrow.beneficiary_id)
  };
}

export function normalizeMilestone(milestone: Milestone): MilestoneUI {
  return {
    ...milestone,
    id: toUIId(milestone.id),
    escrow_id: toUIId(milestone.escrow_id)
  };
}

export function normalizeProof(proof: Proof): ProofUI {
  return {
    ...proof,
    id: toUIId(proof.id),
    proof_id: normalizeOptionalId(proof.proof_id),
    escrow_id: toUIId(proof.escrow_id),
    milestone_id: normalizeOptionalId(proof.milestone_id),
    file_id: normalizeOptionalId(proof.file_id)
  };
}

export function normalizePayment(payment: Payment): PaymentUI {
  return {
    ...payment,
    id: toUIId(payment.id),
    escrow_id: toUIId(payment.escrow_id),
    milestone_id: normalizeOptionalId(payment.milestone_id)
  };
}

export function normalizeEscrowViewerContext(
  context: EscrowViewerContext
): EscrowViewerContextUI {
  return {
    ...context,
    viewer_user_id: normalizeOptionalId(context.viewer_user_id) ?? null
  };
}

export function normalizeSenderEscrowSummary(
  summary: SenderEscrowSummary
): SenderEscrowSummaryUI {
  return {
    ...summary,
    escrow: normalizeEscrowRead(summary.escrow),
    milestones: summary.milestones.map(normalizeMilestone),
    proofs: summary.proofs.map(normalizeProof),
    payments: summary.payments.map(normalizePayment),
    viewer_context: normalizeEscrowViewerContext(summary.viewer_context),
    current_submittable_milestone_id: normalizeOptionalId(
      summary.current_submittable_milestone_id
    )
  };
}

export function normalizeSenderDashboard(dashboard: SenderDashboard): SenderDashboardUI {
  return {
    ...dashboard,
    recent_escrows: dashboard.recent_escrows?.map(normalizeEscrowListItem),
    pending_proofs: dashboard.pending_proofs?.map(normalizeProof),
    recent_payments: dashboard.recent_payments?.map(normalizePayment)
  };
}

export function normalizeAdminEscrowSummary(
  summary: AdminEscrowSummary
): AdminEscrowSummaryUI {
  return {
    ...normalizeSenderEscrowSummary(summary),
    advisor: summary.advisor ?? null
  };
}

export function normalizeProviderInboxItem(
  item: ProviderInboxItemRead
): ProviderInboxItemReadUI {
  return {
    ...item,
    escrow_id: toUIId(item.escrow_id)
  };
}

export function normalizeProviderInboxResponse(
  response: ProviderInboxResponse
): ProviderInboxResponseUI {
  return {
    ...response,
    items: response.items.map(normalizeProviderInboxItem)
  };
}

export function normalizeExternalProofStatus(
  status: ExternalProofStatus
): ExternalProofStatusUI {
  return {
    ...status,
    proof_id: toUIId(status.proof_id),
    escrow_id: toUIId(status.escrow_id)
  };
}

export function normalizeExternalProofSubmitResponse(
  response: ExternalProofSubmitResponse
): ExternalProofSubmitResponseUI {
  return {
    ...response,
    proof_id: toUIId(response.proof_id),
    escrow_id: toUIId(response.escrow_id)
  };
}

export function normalizeExternalProofUploadResponse(
  response: ExternalProofUploadResponse
): ExternalProofUploadResponseUI {
  return {
    ...response,
    escrow_id: toUIId(response.escrow_id)
  };
}

export function normalizeAdminProofReviewItem(
  item: AdminProofReviewItem
): AdminProofReviewItemUI {
  return {
    ...item,
    proof_id: toUIId(item.proof_id),
    escrow_id: toUIId(item.escrow_id),
    milestone_id: normalizeOptionalId(item.milestone_id)
  };
}

export function normalizeAdvisorProofItem(item: AdvisorProofItem): AdvisorProofItemUI {
  return {
    ...item,
    id: toUIId(item.id),
    proof_id: normalizeOptionalId(item.proof_id),
    escrow_id: toUIId(item.escrow_id),
    milestone_id: normalizeOptionalId(item.milestone_id)
  };
}

export function normalizeExternalProofTokenTarget(
  target: ExternalProofTokenTarget
): ExternalProofTokenTargetUI {
  return {
    ...target,
    escrow_id: toUIId(target.escrow_id),
    beneficiary_profile_id: normalizeOptionalId(target.beneficiary_profile_id)
  };
}

export function normalizeExternalProofToken(token: ExternalProofToken): ExternalProofTokenUI {
  return {
    ...token,
    token_id: toUIId(token.token_id),
    target: normalizeExternalProofTokenTarget(token.target)
  };
}

export function normalizeExternalProofTokenList(
  response: ExternalProofTokenListResponse
): ExternalProofTokenListResponseUI {
  if (Array.isArray(response)) {
    return { items: response.map(normalizeExternalProofToken) };
  }
  return {
    ...response,
    items: response.items.map(normalizeExternalProofToken)
  };
}

export function normalizeInflationAdjustment(
  adjustment: InflationAdjustment
): InflationAdjustmentUI {
  return {
    ...adjustment,
    id: toUIId(adjustment.id)
  };
}

export function normalizeInflationAdjustmentList(
  response: InflationAdjustmentListResponse
): InflationAdjustmentListResponseUI {
  if (Array.isArray(response)) {
    return { items: response.map(normalizeInflationAdjustment) };
  }
  return {
    ...response,
    items: response.items.map(normalizeInflationAdjustment)
  };
}
