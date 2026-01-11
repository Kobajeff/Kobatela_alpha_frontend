// TypeScript interfaces describing API payloads exchanged with the Kobatela backend.
export type UserRole = 'user' | 'admin' | 'support' | 'advisor';

export type PayoutChannel = 'off_platform' | 'stripe_connect';

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export type RiskSubjectType = 'MANDATE' | 'ESCROW' | 'PROOF';

export type RiskFeatureSnapshotRead = {
  // Contract: docs/Backend_info/API_GUIDE (12).md — RiskFeatureSnapshotRead — subject_type
  subject_type: RiskSubjectType;
  // Contract: docs/Backend_info/API_GUIDE (12).md — RiskFeatureSnapshotRead — subject_id
  subject_id: number;
  // Contract: docs/Backend_info/API_GUIDE (12).md — RiskFeatureSnapshotRead — version
  version: string | number;
  // Contract: docs/Backend_info/API_GUIDE (12).md — RiskFeatureSnapshotRead — features_json
  features_json: Record<string, unknown>;
  // Contract: docs/Backend_info/API_GUIDE (12).md — RiskFeatureSnapshotRead — computed_at
  computed_at: string;
  // Contract: docs/Backend_info/API_GUIDE (12).md — RiskFeatureSnapshotRead — source_event
  source_event: string;
  // Contract: docs/Backend_info/API_GUIDE (12).md — RiskFeatureSnapshotRead — correlation_id (optional)
  correlation_id?: string | null;
};

export type FraudScoreComparisonRuleBased = {
  // Contract: docs/Backend_info/API_GUIDE (13).md — FraudScoreComparisonResponse.rule_based.score
  score: number | null;
  // Contract: docs/Backend_info/API_GUIDE (13).md — FraudScoreComparisonResponse.rule_based.ai_risk_level
  ai_risk_level: string | null;
  // Contract: docs/Backend_info/API_GUIDE (13).md — FraudScoreComparisonResponse.rule_based.fraud_flags
  fraud_flags: string[];
};

export type FraudScoreComparisonMl = {
  // Contract: docs/Backend_info/API_GUIDE (13).md — FraudScoreComparisonResponse.ml.model_version
  model_version: string;
  // Contract: docs/Backend_info/API_GUIDE (13).md — FraudScoreComparisonResponse.ml.score
  score: number | null;
  // Contract: docs/Backend_info/API_GUIDE (13).md — FraudScoreComparisonResponse.ml.threshold_high_risk
  threshold_high_risk: number;
  // Contract: docs/Backend_info/API_GUIDE (13).md — FraudScoreComparisonResponse.ml.threshold_medium_risk
  threshold_medium_risk: number;
  // Contract: docs/Backend_info/API_GUIDE (13).md — FraudScoreComparisonResponse.ml.suggested_decision
  suggested_decision: 'MANUAL_REVIEW' | 'APPROVED' | null;
};

export type FraudScoreComparisonResponse = {
  // Contract: docs/Backend_info/API_GUIDE (13).md — FraudScoreComparisonResponse.proof_id
  proof_id: string;
  // Contract: docs/Backend_info/API_GUIDE (13).md — FraudScoreComparisonResponse.rule_based
  rule_based: FraudScoreComparisonRuleBased;
  // Contract: docs/Backend_info/API_GUIDE (13).md — FraudScoreComparisonResponse.ml
  ml: FraudScoreComparisonMl;
};

export type AlertRead = {
  // Contract: docs/Backend_info/API_GUIDE (11).md — AlertRead — id
  id: string | number;
  // Contract: docs/Backend_info/API_GUIDE (11).md — AlertRead — type
  type: string;
  // Contract: docs/Backend_info/API_GUIDE (11).md — AlertRead — message
  message: string;
  // Contract: docs/Backend_info/API_GUIDE (11).md — AlertRead — payload
  payload?: Record<string, unknown> | null;
  // Contract: docs/Backend_info/API_GUIDE (11).md — AlertRead — created_at
  created_at?: string;
  // Contract: docs/Backend_info/API_GUIDE (11).md — AlertRead — updated_at
  updated_at?: string;
};

export type MerchantSuggestionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type MerchantSuggestion = {
  id: string;
  name: string;
  country_code: string;
  status: MerchantSuggestionStatus;
  promotion_registry_id?: string | null;
  metadata?: Record<string, unknown> | null;
  tax_id?: string | null;
  account_number?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type MerchantSuggestionListResponse =
  | MerchantSuggestion[]
  | {
      items?: MerchantSuggestion[];
      total?: number;
      limit?: number;
      offset?: number;
    };

export type MerchantSuggestionCreatePayload = {
  name: string;
  country_code: string;
  contact?: Record<string, unknown> | null;
  tax_id?: string | null;
  account_number?: string | null;
  mandate_id?: number | null;
  escrow_id?: number | null;
  metadata?: Record<string, unknown> | null;
};

export type PayoutDestinationType = 'BENEFICIARY_PROVIDER' | 'MERCHANT';

export type MerchantSuggestionPayload = {
  name: string;
  country_code: string;
};

export type BeneficiaryOffPlatformCreate = {
  // Contract: docs/Backend_info/FRONTEND_MANDATE_ESCROW_UX_CONTRACT (2).md — 2.1 Create Mandate — beneficiary.full_name
  full_name: string;
  // Contract: docs/Backend_info/FRONTEND_MANDATE_ESCROW_UX_CONTRACT (2).md — 2.1 Create Mandate — beneficiary.email
  email: string;
  // Contract: docs/Backend_info/FRONTEND_MANDATE_ESCROW_UX_CONTRACT (2).md — 2.1 Create Mandate — beneficiary.phone_number
  phone_number: string;
  // Contract: docs/Backend_info/FRONTEND_MANDATE_ESCROW_UX_CONTRACT (2).md — 2.1 Create Mandate — beneficiary.address_line1
  address_line1: string;
  // Contract: docs/Backend_info/FRONTEND_MANDATE_ESCROW_UX_CONTRACT (2).md — 2.1 Create Mandate — beneficiary.address_country_code
  address_country_code: string;
  // Contract: docs/Backend_info/FRONTEND_MANDATE_ESCROW_UX_CONTRACT (2).md — 2.1 Create Mandate — beneficiary.bank_account
  bank_account: string;
  // Contract: docs/Backend_info/FRONTEND_MANDATE_ESCROW_UX_CONTRACT (2).md — 2.1 Create Mandate — beneficiary.national_id_number
  national_id_number?: string;
};

export type BeneficiaryProfilePublicRead = {
  // Contract: docs/Backend_info/API_GUIDE (7).md — BeneficiaryProfilePublicRead — id
  id?: string | number;
  // Contract: docs/Backend_info/API_GUIDE (7).md — BeneficiaryProfilePublicRead — full_name
  full_name?: string | null;
  // Contract: docs/Backend_info/API_GUIDE (7).md — BeneficiaryProfilePublicRead — email
  email?: string | null;
  // Contract: docs/Backend_info/API_GUIDE (7).md — BeneficiaryProfilePublicRead — phone_number
  phone_number?: string | null;
  // Contract: docs/Backend_info/API_GUIDE (7).md — BeneficiaryProfilePublicRead — address_line1
  address_line1?: string | null;
  // Contract: docs/Backend_info/API_GUIDE (7).md — BeneficiaryProfilePublicRead — address_country_code
  address_country_code?: string | null;
  // Contract: docs/Backend_info/API_GUIDE (7).md — BeneficiaryProfilePublicRead — bank_account (masked in public view)
  bank_account?: string | null;
  // Contract: docs/Backend_info/API_GUIDE (7).md — BeneficiaryProfilePublicRead — national_id_number (masked in public view)
  national_id_number?: string | null;
  // Contract: docs/Backend_info/API_GUIDE (7).md — BeneficiaryProfilePublicRead — masked
  masked?: boolean;
  // Contract: docs/Backend_info/API_GUIDE (7).md — BeneficiaryProfilePublicRead — created_at
  created_at?: string;
  // Contract: docs/Backend_info/API_GUIDE (7).md — BeneficiaryProfilePublicRead — updated_at
  updated_at?: string;
} & Record<string, unknown>;

export type BeneficiaryProfileAdminRead = {
  // Contract: docs/Backend_info/API_GUIDE (15).md — BeneficiaryProfileAdminRead — id
  id?: string | number;
  // Contract: docs/Backend_info/API_GUIDE (15).md — BeneficiaryProfileAdminRead — owner_user_id
  owner_user_id?: string | number | null;
  // Contract: docs/Backend_info/API_GUIDE (15).md — BeneficiaryProfileAdminRead — user_id
  user_id?: string | number | null;
  // Contract: docs/Backend_info/API_GUIDE (15).md — BeneficiaryProfileAdminRead — first_name
  first_name?: string | null;
  // Contract: docs/Backend_info/API_GUIDE (15).md — BeneficiaryProfileAdminRead — last_name
  last_name?: string | null;
  // Contract: docs/Backend_info/API_GUIDE (15).md — BeneficiaryProfileAdminRead — full_name
  full_name?: string | null;
  // Contract: docs/Backend_info/API_GUIDE (15).md — BeneficiaryProfileAdminRead — email
  email?: string | null;
  // Contract: docs/Backend_info/API_GUIDE (15).md — BeneficiaryProfileAdminRead — phone
  phone?: string | null;
  // Contract: docs/Backend_info/API_GUIDE (15).md — BeneficiaryProfileAdminRead — address_line1
  address_line1?: string | null;
  // Contract: docs/Backend_info/API_GUIDE (15).md — BeneficiaryProfileAdminRead — address_line2
  address_line2?: string | null;
  // Contract: docs/Backend_info/API_GUIDE (15).md — BeneficiaryProfileAdminRead — city
  city?: string | null;
  // Contract: docs/Backend_info/API_GUIDE (15).md — BeneficiaryProfileAdminRead — postal_code
  postal_code?: string | null;
  // Contract: docs/Backend_info/API_GUIDE (15).md — BeneficiaryProfileAdminRead — country_code
  country_code?: string | null;
  // Contract: docs/Backend_info/API_GUIDE (15).md — BeneficiaryProfileAdminRead — iban
  iban?: string | null;
  // Contract: docs/Backend_info/API_GUIDE (15).md — BeneficiaryProfileAdminRead — bank_account
  bank_account?: string | null;
  // Contract: docs/Backend_info/API_GUIDE (15).md — BeneficiaryProfileAdminRead — bank_account_number
  bank_account_number?: string | null;
  // Contract: docs/Backend_info/API_GUIDE (15).md — BeneficiaryProfileAdminRead — bank_routing_number
  bank_routing_number?: string | null;
  // Contract: docs/Backend_info/API_GUIDE (15).md — BeneficiaryProfileAdminRead — mobile_money_number
  mobile_money_number?: string | null;
  // Contract: docs/Backend_info/API_GUIDE (15).md — BeneficiaryProfileAdminRead — mobile_money_provider
  mobile_money_provider?: string | null;
  // Contract: docs/Backend_info/API_GUIDE (15).md — BeneficiaryProfileAdminRead — payout_channel
  payout_channel?: string | null;
  // Contract: docs/Backend_info/API_GUIDE (15).md — BeneficiaryProfileAdminRead — national_id_type
  national_id_type?: NationalIdType | null;
  // Contract: docs/Backend_info/API_GUIDE (15).md — BeneficiaryProfileAdminRead — national_id_number
  national_id_number?: string | null;
  // Contract: docs/Backend_info/API_GUIDE (15).md — BeneficiaryProfileAdminRead — metadata
  metadata?: Record<string, unknown> | null;
  // Contract: docs/Backend_info/API_GUIDE (15).md — BeneficiaryProfileAdminRead — notes
  notes?: string | null;
  // Contract: docs/Backend_info/API_GUIDE (15).md — BeneficiaryProfileAdminRead — is_active
  is_active?: boolean | null;
  // Contract: docs/Backend_info/API_GUIDE (15).md — BeneficiaryProfileAdminRead — masked
  masked?: boolean;
  // Contract: docs/Backend_info/API_GUIDE (15).md — BeneficiaryProfileAdminRead — created_at
  created_at?: string;
  // Contract: docs/Backend_info/API_GUIDE (15).md — BeneficiaryProfileAdminRead — updated_at
  updated_at?: string;
} & Record<string, unknown>;

type UsageMandateBase = {
  total_amount: string;
  currency: string;
  expires_at: string;
  payout_destination_type?: PayoutDestinationType;
  merchant_registry_id?: string;
  merchant_suggestion?: MerchantSuggestionPayload;
};

export type UsageMandateCreate =
  | (UsageMandateBase & { beneficiary_id: number; beneficiary?: never })
  | (UsageMandateBase & { beneficiary: BeneficiaryOffPlatformCreate; beneficiary_id?: never });

export type UsageMandateRead = {
  id: string | number;
  sender_id?: number;
  beneficiary_id?: number;
  provider_user_id?: number;
  beneficiary_profile_id?: number | null;
  beneficiary_profile?: BeneficiaryProfilePublicRead | null;
  total_amount?: string | number;
  currency?: string;
  expires_at?: string;
  payout_destination_type?: PayoutDestinationType;
  merchant_registry_id?: string | null;
  merchant_suggestion_id?: string | null;
  merchant_suggestion?: MerchantSuggestionPayload | null;
  created_at?: string;
} & Record<string, unknown>;

export interface User {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  payout_channel?: string | null;
  created_at?: string;
  is_active?: boolean;
}

export type NationalIdType = 'ID_CARD' | 'PASSPORT';

export interface UserProfile {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country_code?: string | null;
  bank_account?: string | null;
  national_id_type?: NationalIdType | null;
  national_id_number?: string | null;
  spoken_languages?: string[] | null;
  residence_region?: string | null;
  habitual_send_region?: string | null;
  masked?: boolean;
}

export type UserProfileUpdatePayload = Partial<
  Omit<UserProfile, 'masked'>
>;


export type EscrowStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'FUNDED'
  | 'RELEASABLE'
  | 'RELEASED'
  | 'REFUNDED'
  | 'CANCELLED';

export type EscrowListItem = {
  id: string | number;
  status: EscrowStatus;
  amount_total: string;
  currency: string;
  created_at: string;
  deadline_at?: string;
  provider_user_id?: number;
  beneficiary_id?: number;
  beneficiary_profile_id?: number | null;
  domain?: 'private' | 'public' | 'aid';
  // Legacy fields kept for backward compatibility in existing UI components.
  amount?: number;
  updated_at?: string;
  client_id?: string | number;
  provider_id?: string | number;
  release_conditions?: string;
  deadline?: string;
};

export type EscrowReleaseConditionMilestone = {
  label: string;
  idx: number;
};

export type EscrowReleaseConditions = {
  requires_proof: boolean;
  milestones?: EscrowReleaseConditionMilestone[];
};

export type FundingSessionRead = {
  funding_id: number;
  client_secret: string;
};

export type BeneficiaryCreate = {
  // Contract: docs/Backend_info/API_GUIDE (7).md — BeneficiaryCreate — full_name
  full_name: string;
  // Contract: docs/Backend_info/API_GUIDE (7).md — BeneficiaryCreate — email
  email: string;
  // Contract: docs/Backend_info/API_GUIDE (7).md — BeneficiaryCreate — phone_number
  phone_number: string;
  // Contract: docs/Backend_info/API_GUIDE (7).md — BeneficiaryCreate — address_line1
  address_line1: string;
  // Contract: docs/Backend_info/API_GUIDE (7).md — BeneficiaryCreate — address_country_code
  address_country_code: string;
  // Contract: docs/Backend_info/API_GUIDE (7).md — BeneficiaryCreate — bank_account
  bank_account: string;
  // Contract: docs/Backend_info/API_GUIDE (7).md — BeneficiaryCreate — national_id_number
  national_id_number: string;
};

export type EscrowCreatePayload = {
  // Contract: docs/Backend_info/FRONTEND_MANDATE_ESCROW_UX_CONTRACT (2).md — 2.3 Create Escrow — provider_user_id XOR beneficiary
  provider_user_id?: number;
  // Contract: docs/Backend_info/FRONTEND_MANDATE_ESCROW_UX_CONTRACT (2).md — 2.3 Create Escrow — beneficiary
  beneficiary?: BeneficiaryCreate;
  amount_total: string;
  currency: 'USD' | 'EUR' | string;
  release_conditions: EscrowReleaseConditions;
  requires_proof?: boolean;
  deadline_at: string;
  domain?: 'private' | 'public' | 'aid';
};

export type EscrowDestination =
  | { type: 'provider'; provider_user_id: string }
  | { type: 'beneficiary'; beneficiary: BeneficiaryCreate };

export type EscrowRead = EscrowListItem & {
  // Contract: docs/Backend_info/API_GUIDE (7).md — EscrowRead — sender_user_id
  sender_user_id?: number | null;
  // Contract: docs/Backend_info/API_GUIDE (7).md — EscrowRead — client_id (alias)
  client_id?: number | string | null;
  // Contract: docs/Backend_info/API_GUIDE (7).md — EscrowRead — beneficiary_id
  beneficiary_id?: number | null;
  // Contract: docs/Backend_info/API_GUIDE (7).md — EscrowRead — beneficiary_profile
  beneficiary_profile?: BeneficiaryProfilePublicRead | null;
  // Contract: docs/Backend_info/API_GUIDE (7).md — EscrowRead — release_conditions_json
  release_conditions_json?: EscrowReleaseConditions | Record<string, unknown> | null;
  // Contract: docs/Backend_info/API_GUIDE (7).md — EscrowRead — deadline_at
  deadline_at?: string | null;
};

export type ProofMetadata = Record<string, unknown>;

export type CreateProofPayload = {
  escrow_id: string;
  milestone_id?: string | number;
  milestone_idx?: number;
  type: ProofType;
  storage_key: string;
  storage_url: string;
  sha256: string;
  metadata?: ProofMetadata;
};

export type AiAnalysis = {
  ai_risk_level: 'warning' | 'suspect' | null;
  ai_score: number | string | null;
  ai_explanation: string | null;
  ai_checked_at: string | null;
  ai_score_ml?: number | string | null;
  ai_risk_level_ml?: string | null;
  ai_flags?: string[] | null;
  ai_reviewed_by?: string | number | null;
  ai_reviewed_at?: string | null;
};

export type ProofStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type ProofDecision = 'approve' | 'reject';

export interface ProofDecisionRequest {
  decision: ProofDecision;
  comment?: string;
}

export type Proof = {
  id: string;
  proof_id?: string | number;
  escrow_id: string;
  milestone_id?: string | number;
  milestone_idx?: number | null;
  type?: ProofType;
  storage_key?: string;
  storage_url?: string;
  sha256?: string;
  metadata?: ProofMetadata | null;
  description?: string;
  attachment_url?: string;
  file_id?: string;
  file_url?: string;
  status: ProofStatus;
  created_at: string;
  invoice_total_amount?: string | number | null;
  invoice_currency?: string | null;
  payout_eligible?: boolean | null;
  payout_blocked_reasons?: string[] | null;
} & AiAnalysis;

export type ProofDecisionResponse = Proof;

export type PaymentStatus = 'PENDING' | 'SENT' | 'SETTLED' | 'ERROR' | 'REFUNDED';

export type AdvisorProofItem = Proof & {
  milestone_name?: string;
  sender_email?: string;
};

export type MilestoneStatus =
  | 'WAITING'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAYING'
  | 'PAID';

export type MilestoneProofRequirements = Record<string, unknown>;

export type MilestoneCreatePayload = {
  // Contract: docs/Backend_info/API_GUIDE (7).md — MilestoneCreate — label
  label: string;
  // Contract: docs/Backend_info/API_GUIDE (7).md — MilestoneCreate — amount
  amount: string;
  // Contract: docs/Backend_info/API_GUIDE (7).md — MilestoneCreate — currency
  currency: string;
  // Contract: docs/Backend_info/API_GUIDE (7).md — MilestoneCreate — sequence_index
  sequence_index: number;
  // Contract: docs/Backend_info/API_GUIDE (7).md — MilestoneCreate — proof_kind
  proof_kind?: string;
  // Contract: docs/Backend_info/API_GUIDE (7).md — MilestoneCreate — proof_requirements
  proof_requirements?: MilestoneProofRequirements;
};

export type Milestone = {
  // Contract: docs/Backend_info/API_GUIDE (7).md — MilestoneRead — id
  id: number | string;
  // Contract: docs/Backend_info/API_GUIDE (7).md — MilestoneRead — escrow_id
  escrow_id: number | string;
  // Contract: docs/Backend_info/API_GUIDE (7).md — MilestoneRead — label
  label: string;
  // Contract: docs/Backend_info/API_GUIDE (7).md — MilestoneRead — amount
  amount: string;
  // Contract: docs/Backend_info/API_GUIDE (7).md — MilestoneRead — currency
  currency: string;
  // Contract: docs/Backend_info/API_GUIDE (7).md — MilestoneRead — sequence_index
  sequence_index: number;
  // Contract: docs/Backend_info/API_GUIDE (7).md — MilestoneRead — status
  status: MilestoneStatus;
  // Contract: docs/Backend_info/API_GUIDE (7).md — MilestoneRead — proof_kind
  proof_kind?: string | null;
  // Contract: docs/Backend_info/API_GUIDE (7).md — MilestoneRead — proof_requirements
  proof_requirements?: MilestoneProofRequirements;
  // Deprecated UI fields kept for compatibility with existing renders.
  name?: string;
  due_date?: string;
};

export type GovProjectRead = {
  // Contract: docs/Backend_info/API_GUIDE (16).md — GovProjectRead — id
  id: number;
  // Contract: docs/Backend_info/API_GUIDE (16).md — GovProjectRead — label
  label: string;
  // Contract: docs/Backend_info/API_GUIDE (16).md — GovProjectRead — project_type
  project_type: string;
  // Contract: docs/Backend_info/API_GUIDE (16).md — GovProjectRead — country
  country: string;
  // Contract: docs/Backend_info/API_GUIDE (16).md — GovProjectRead — city (optional)
  city?: string | null;
  // Contract: docs/Backend_info/API_GUIDE (16).md — GovProjectRead — domain
  domain: 'public' | 'aid' | string;
  // Contract: docs/Backend_info/API_GUIDE (16).md — GovProjectRead — status
  status: string;
  // Contract: docs/Backend_info/API_GUIDE (16).md — GovProjectRead — total_amount
  total_amount: string;
  // Contract: docs/Backend_info/API_GUIDE (16).md — GovProjectRead — released_amount
  released_amount: string;
  // Contract: docs/Backend_info/API_GUIDE (16).md — GovProjectRead — remaining_amount
  remaining_amount: string;
  // Contract: docs/Backend_info/API_GUIDE (16).md — GovProjectRead — current_milestone (optional)
  current_milestone?: number | null;
  // Contract: docs/Backend_info/API_GUIDE (16).md — GovProjectRead — risk_excluded_escrows
  risk_excluded_escrows: number;
  // Contract: docs/Backend_info/API_GUIDE (16).md — GovProjectRead — risk_excluded_amount
  risk_excluded_amount: string;
};

export type AllowedUsageRead = {
  // Contract: docs/Backend_info/API_GUIDE (15).md — Spend/Usage — GET /admin/spend/allowed — id
  id: number;
  // Contract: docs/Backend_info/API_GUIDE (15).md — Spend/Usage — GET /admin/spend/allowed — owner_id
  owner_id: number;
  // Contract: docs/Backend_info/API_GUIDE (15).md — Spend/Usage — GET /admin/spend/allowed — merchant_id
  merchant_id: number;
  // Contract: docs/Backend_info/API_GUIDE (15).md — Spend/Usage — GET /admin/spend/allowed — category_id
  category_id: number;
  // Contract: docs/Backend_info/API_GUIDE (15).md — Spend/Usage — GET /admin/spend/allowed — created_at
  created_at: string;
  // Contract: docs/Backend_info/API_GUIDE (15).md — Spend/Usage — GET /admin/spend/allowed — updated_at
  updated_at: string;
};

export type TransactionRead = {
  // Contract: docs/Backend_info/API_GUIDE (14).md — TransactionRead — id
  id: string | number;
  // Contract: docs/Backend_info/API_GUIDE (14).md — TransactionRead — sender_id
  sender_id: string | number;
  // Contract: docs/Backend_info/API_GUIDE (14).md — TransactionRead — receiver_id
  receiver_id: string | number;
  // Contract: docs/Backend_info/API_GUIDE (14).md — TransactionRead — amount
  amount: string | number;
  // Contract: docs/Backend_info/API_GUIDE (14).md — TransactionRead — currency
  currency: string;
  // Contract: docs/Backend_info/API_GUIDE (14).md — TransactionRead — status
  status: string;
  // Contract: docs/Backend_info/API_GUIDE (14).md — TransactionRead — created_at
  created_at: string;
  // Contract: docs/Backend_info/API_GUIDE (14).md — TransactionRead — updated_at
  updated_at: string;
};

export type Payment = {
  id: string;
  escrow_id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  created_at: string;
  psp_ref?: string | null;
  idempotency_key?: string | null;
  payout_blocked_reasons?: string[] | null;
};

export type EscrowViewerContext = {
  relation: 'SENDER' | 'PROVIDER' | 'PARTICIPANT' | 'OPS' | 'UNKNOWN';
  allowed_actions: string[];
  is_sender: boolean;
  is_provider: boolean;
  is_participant: boolean;
  viewer_user_id: number | string | null;
};

export type SenderEscrowSummary = {
  escrow: EscrowRead;
  milestones: Milestone[];
  proofs: Proof[];
  payments: Payment[];
  viewer_context: EscrowViewerContext;
  current_submittable_milestone_id?: number | null;
  current_submittable_milestone_idx?: number | null;
};

export type AdminEscrowSummary = SenderEscrowSummary & {
  // Contract: docs/Backend_info/API_GUIDE (11).md — AdminEscrowSummaryRead — GET /admin/escrows/{escrow_id}/summary
  advisor?: AdvisorProfile | null;
};

export type SenderDashboard = {
  // Contract: docs/Backend_info/API_GUIDE (11).md — Sender dashboard payload — GET /sender/dashboard — sender
  profile?: Record<string, unknown>;
  // Contract: docs/Backend_info/API_GUIDE (11).md — Sender dashboard payload — counts
  counts?: Record<string, number>;
  // Contract: docs/Backend_info/API_GUIDE (11).md — Sender dashboard payload — recent_escrows
  recent_escrows?: EscrowListItem[];
  // Contract: docs/Backend_info/API_GUIDE (11).md — Sender dashboard payload — actions (when include_actions=true)
  actions?: unknown[];
  // Contract: docs/Backend_info/API_GUIDE (11).md — Sender dashboard payload — pending_proofs
  pending_proofs?: Proof[];
  // Contract: docs/Backend_info/API_GUIDE (11).md — Sender dashboard payload — recent_payments
  recent_payments?: Payment[];
  // Contract: docs/Backend_info/API_GUIDE (11).md — Sender dashboard payload — stats (legacy compatibility)
  stats?: Record<string, unknown>;
};

export type ProviderInboxItemRead = {
  escrow_id: number;
  escrow_status: EscrowStatus;
  sender_display: string;
  amount_total: string;
  currency: string;
  deadline_at: string | null;
  current_submittable_milestone_idx: number | null;
  required_proof_kinds: string[];
  last_update_at: string;
};

export type ProviderInboxResponse = {
  items: ProviderInboxItemRead[];
  total: number;
  limit: number;
  offset: number;
};

export type InflationAdjustment = {
  id: string | number;
  name?: string;
  label?: string;
  created_at?: string;
  updated_at?: string;
  active?: boolean;
  payload?: Record<string, unknown> | null;
} & Record<string, unknown>;

export type InflationAdjustmentListResponse =
  | {
      items: InflationAdjustment[];
      total: number;
      limit?: number;
      offset?: number;
    }
  | InflationAdjustment[];

export type InflationAdjustmentCreatePayload = Record<string, unknown>;
export type InflationAdjustmentUpdatePayload = Record<string, unknown>;

export interface AuthLoginResponse {
  access_token?: string;
  token?: string;
  user: import('./auth').AuthUser;
}

export type AuthMeResponse = import('./auth').AuthMeResponse;

export interface ApiKey {
  id: string;
  name?: string;
  scope: string;
  is_active: boolean;
  user_id?: string;
  user?: Pick<User, 'id' | 'email' | 'username' | 'role'>;
  created_at?: string;
  updated_at?: string;
}

export interface SenderAccountRow {
  user_id: string;
  email: string;
  username?: string;
  role: UserRole;
  api_key_id: string;
  api_key_name?: string;
  is_active: boolean;
  created_at?: string;
}

export type AdminDashboardStats = {
  total_escrows: number;
  pending_proofs: number;
  approved_proofs: number;
  rejected_proofs: number;
  total_payments: number;
};

export interface AdminUserCreatePayload {
  email: string;
  role: UserRole;
  issue_api_key?: boolean;
}

export interface UserCreatePayload {
  // Contract: docs/Backend_info/API_GUIDE (8).md — UserCreate — username
  username: string;
  // Contract: docs/Backend_info/API_GUIDE (8).md — UserCreate — email
  email: string;
  // Contract: docs/Backend_info/API_GUIDE (8).md — UserCreate — is_active
  is_active?: boolean;
  // Contract: docs/Backend_info/API_GUIDE (8).md — UserCreate — role
  role?: UserRole;
  // Contract: docs/Backend_info/API_GUIDE (8).md — UserCreate — payout_channel
  payout_channel?: PayoutChannel;
}

export interface AdminUserCreateResponse {
  user: import('./auth').AuthUser;
  token: string | null;
  token_type: 'api_key';
}

export interface AdminSender {
  id: number;
  email: string;
  role: UserRole;
  created_at: string;
  is_active: boolean;
}

export type AdminProofReviewItem = {
  proof_id: number;
  escrow_id: number;
  milestone_id?: number | null;
  status: ProofStatus;
  type: ProofType;
  storage_key?: string | null;
  storage_url?: string | null;
  sha256?: string | null;
  created_at: string;
  invoice_total_amount?: string | null;
  invoice_currency?: string | null;
  ai_risk_level: AiAnalysis['ai_risk_level'];
  ai_score: AiAnalysis['ai_score'];
  ai_flags?: AiAnalysis['ai_flags'];
  ai_explanation: AiAnalysis['ai_explanation'];
  ai_checked_at: AiAnalysis['ai_checked_at'];
  ai_reviewed_by: AiAnalysis['ai_reviewed_by'];
  ai_reviewed_at: AiAnalysis['ai_reviewed_at'];
  metadata?: ProofMetadata | null;
  advisor?: AdvisorSummary | null;
  payout_eligible?: boolean | null;
  payout_blocked_reasons?: string[] | null;
};

export type ProofType = 'PHOTO' | 'DOCUMENT';

export interface ProofFileUploadResponse {
  file_id: string;
  storage_key: string;
  storage_url: string;
  sha256: string;
  content_type: string;
  size_bytes: number;
  escrow_id?: number | string;
  uploaded_by_role?: string;
  uploaded_by_user_id?: number | string;
  bound?: boolean;
  file_url?: string;
}

export type ExternalProofUploadResponse = {
  storage_key: string;
  storage_url: string;
  sha256: string;
  content_type: string;
  size_bytes: number;
  escrow_id: number | string;
  milestone_idx: number;
};

export type ExternalProofSubmitPayload = {
  escrow_id: number | string;
  milestone_idx: number;
  type: ProofType;
  storage_key: string;
  storage_url: string;
  sha256: string;
  metadata?: ProofMetadata;
};

export type ExternalProofSubmitResponse = {
  proof_id: number | string;
  status: ProofStatus;
  escrow_id: number | string;
  milestone_idx: number;
  created_at: string;
};

export type ExternalProofTokenStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'USED';

export type ExternalProofTokenTarget = {
  // Contract: docs/Backend_info/API_GUIDE (11).md — ExternalProofTokenRequest — escrow_id
  escrow_id: number | string;
  // Contract: docs/Backend_info/API_GUIDE (11).md — ExternalProofTokenRequest — milestone_idx
  milestone_idx: number;
  beneficiary_profile_id?: number | null;
};

export type ExternalProofToken = {
  token_id: number | string;
  status: ExternalProofTokenStatus;
  // Contract: docs/Backend_info/API_GUIDE (11).md — External proof tokens — expires_at
  expires_at: string;
  token?: string | null;
  max_uploads?: number | null;
  note?: string | null;
  target: ExternalProofTokenTarget;
  created_at?: string;
  revoked_at?: string | null;
  last_used_at?: string | null;
};

export type ExternalProofTokenIssuePayload = {
  // Contract: docs/Backend_info/API_GUIDE (11).md — POST /sender/external-proof-tokens — escrow_id
  escrow_id: number | string;
  // Contract: docs/Backend_info/API_GUIDE (11).md — POST /sender/external-proof-tokens — milestone_idx
  milestone_idx: number;
  // Contract: docs/Backend_info/API_GUIDE (11).md — POST /sender/external-proof-tokens — expires_in_minutes
  expires_in_minutes?: number;
  // Contract: docs/Backend_info/API_GUIDE (11).md — POST /sender/external-proof-tokens — max_uploads
  max_uploads?: number;
  issued_to_email?: string;
  note?: string;
  beneficiary_profile_id?: number;
  target_type?: string;
};

export type ExternalProofTokenListResponse =
  | {
      items: ExternalProofToken[];
      total: number;
      limit?: number;
      offset?: number;
    }
  | ExternalProofToken[];

export type ExternalEscrowMilestoneSummary = {
  milestone_idx: number;
  label?: string;
  amount?: string;
  status?: string;
  requires_proof?: boolean;
  last_proof_status?: string | null;
};

export type ExternalEscrowSummary = {
  escrow_id: number | string;
  status: string;
  currency?: string;
  amount_total?: string;
  milestones: ExternalEscrowMilestoneSummary[];
};

export type ExternalProofStatus = {
  proof_id: number | string;
  status: ProofStatus;
  escrow_id: number | string;
  milestone_idx: number;
  terminal: boolean;
  submitted_at: string;
  reviewed_at?: string | null;
};

export interface AdvisorProfile {
  id: string;
  user_id: string;
  advisor_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  country?: string | null;
  language?: string | null;
  profile_photo?: string | null;
  short_description?: string | null;
  advisor_grade?: string | null;
  advisor_review?: number | null;
  blocked: boolean;
  sender_managed: number;
  total_number_of_case_managed: number;
  subscribe_date: string;
  is_active: boolean;
  load_stats?: {
    open_proofs?: number;
    active_senders?: number;
  };
}

export interface AdvisorProfileCreatePayload {
  user_id: number;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  country?: string | null;
  language?: string | null;
  profile_photo?: string | null;
  short_description?: string | null;
  advisor_grade?: string | null;
  is_active?: boolean | null;
  blocked?: boolean | null;
}

export type AdvisorProfileUpdatePayload = Partial<
  Omit<AdvisorProfileCreatePayload, 'user_id'>
> & {
  advisor_review?: number | null;
};

export interface AdminAdvisorSummary {
  advisor_id: string;
  name: string;
  email: string;
  sender_managed: number;
  total_number_of_case_managed: number;
  open_proofs?: number;
}

export interface AdminAdvisorListItem {
  id: string;
  user_id: string;
  advisor_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  blocked: boolean;
  is_active: boolean;
  sender_managed: number;
  total_number_of_case_managed: number;
  country?: string | null;
  language?: string | null;
  advisor_grade?: string | null;
  open_proofs?: number;
}

export interface AdvisorSenderItem {
  sender_id: number;
  sender_email: string;
  active: boolean;
  assigned_at: string;
}

export interface AdvisorSummary {
  id: number;
  advisor_id?: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  country?: string | null;
  language?: string | null;
  advisor_grade?: string | null;
  advisor_review?: string | null;
  sender_managed?: number | null;
  total_number_of_case_managed?: number | null;
}

export interface AdminSettingRead {
  key: string;
  value?: boolean | null;
  effective: boolean;
}
