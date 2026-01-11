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
  SenderEscrowSummary
} from '@/types/api';
import type {
  ExternalProofStatus,
  ExternalProofSubmitResponse,
  ExternalProofUploadResponse
} from '@/types/api-external';
import type { InflationAdjustment, InflationAdjustmentListResponse } from '@/types/api';
import type { ExternalProofToken, ExternalProofTokenListResponse, ExternalProofTokenTarget } from '@/types/api';
import type { UIId } from '@/types/id';

export type EscrowListItemUI = Omit<
  EscrowListItem,
  | 'id'
  | 'provider_user_id'
  | 'beneficiary_id'
  | 'beneficiary_profile_id'
  | 'client_id'
  | 'provider_id'
> & {
  id: UIId;
  provider_user_id?: UIId | null;
  beneficiary_id?: UIId | null;
  beneficiary_profile_id?: UIId | null;
  client_id?: UIId | null;
  provider_id?: UIId | null;
};

export type EscrowReadUI = Omit<
  EscrowRead,
  'id' | 'client_id' | 'provider_user_id' | 'provider_id' | 'beneficiary_id'
> & {
  id: UIId;
  client_id?: UIId | null;
  provider_user_id?: UIId | null;
  provider_id?: UIId | null;
  beneficiary_id?: UIId | null;
};

export type MilestoneUI = Omit<Milestone, 'id' | 'escrow_id'> & {
  id: UIId;
  escrow_id: UIId;
};

export type ProofUI = Omit<Proof, 'id' | 'proof_id' | 'escrow_id' | 'milestone_id' | 'file_id'> & {
  id: UIId;
  proof_id?: UIId | null;
  escrow_id: UIId;
  milestone_id?: UIId | null;
  file_id?: UIId | null;
};

export type PaymentUI = Omit<Payment, 'id' | 'escrow_id' | 'milestone_id'> & {
  id: UIId;
  escrow_id: UIId;
  milestone_id?: UIId | null;
};

export type EscrowViewerContextUI = Omit<EscrowViewerContext, 'viewer_user_id'> & {
  viewer_user_id: UIId | null;
};

export type SenderEscrowSummaryUI = Omit<
  SenderEscrowSummary,
  'escrow' | 'milestones' | 'proofs' | 'payments' | 'viewer_context' | 'current_submittable_milestone_id'
> & {
  escrow: EscrowReadUI;
  milestones: MilestoneUI[];
  proofs: ProofUI[];
  payments: PaymentUI[];
  viewer_context: EscrowViewerContextUI;
  current_submittable_milestone_id?: UIId | null;
};

export type SenderDashboardUI = Omit<
  SenderDashboard,
  'recent_escrows' | 'pending_proofs' | 'recent_payments'
> & {
  recent_escrows?: EscrowListItemUI[];
  pending_proofs?: ProofUI[];
  recent_payments?: PaymentUI[];
};

export type AdminEscrowSummaryUI = SenderEscrowSummaryUI &
  Omit<
    AdminEscrowSummary,
    'escrow' | 'milestones' | 'proofs' | 'payments' | 'viewer_context' | 'current_submittable_milestone_id'
  > & {
    current_submittable_milestone_id?: UIId | null;
  };

export type ProviderInboxItemReadUI = Omit<ProviderInboxItemRead, 'escrow_id'> & {
  escrow_id: UIId;
};

export type ProviderInboxResponseUI = Omit<ProviderInboxResponse, 'items'> & {
  items: ProviderInboxItemReadUI[];
};

export type ExternalProofStatusUI = Omit<ExternalProofStatus, 'proof_id' | 'escrow_id'> & {
  proof_id: UIId;
  escrow_id: UIId;
};

export type ExternalProofSubmitResponseUI = Omit<ExternalProofSubmitResponse, 'proof_id' | 'escrow_id'> & {
  proof_id: UIId;
  escrow_id: UIId;
};

export type ExternalProofUploadResponseUI = Omit<ExternalProofUploadResponse, 'escrow_id'> & {
  escrow_id: UIId;
};

export type AdminProofReviewItemUI = Omit<
  AdminProofReviewItem,
  'proof_id' | 'escrow_id' | 'milestone_id'
> & {
  proof_id: UIId;
  escrow_id: UIId;
  milestone_id?: UIId | null;
};

export type AdvisorProofItemUI = Omit<AdvisorProofItem, 'id' | 'proof_id' | 'escrow_id' | 'milestone_id'> & {
  id: UIId;
  proof_id?: UIId | null;
  escrow_id: UIId;
  milestone_id?: UIId | null;
};

export type ExternalProofTokenTargetUI = Omit<ExternalProofTokenTarget, 'escrow_id' | 'beneficiary_profile_id'> & {
  escrow_id: UIId;
  beneficiary_profile_id?: UIId | null;
};

export type ExternalProofTokenUI = Omit<ExternalProofToken, 'token_id' | 'target'> & {
  token_id: UIId;
  target: ExternalProofTokenTargetUI;
};

export type ExternalProofTokenListResponseUI = {
  items: ExternalProofTokenUI[];
  total?: number;
  limit?: number;
  offset?: number;
};

export type InflationAdjustmentUI = Omit<InflationAdjustment, 'id'> & {
  id: UIId;
};

export type InflationAdjustmentListResponseUI = {
  items: InflationAdjustmentUI[];
  total?: number;
  limit?: number;
  offset?: number;
};
