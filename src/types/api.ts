// TypeScript interfaces describing API payloads exchanged with the Kobatela backend.
export type UserRole = 'sender' | 'admin' | 'both' | 'advisor' | 'support';

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export type MerchantSuggestionStatus = string;

export type MerchantSuggestion = {
  id: string;
  status?: MerchantSuggestionStatus;
  created_at?: string;
  updated_at?: string;
  promotion_registry_id?: string | null;
  review_reason?: string | null;
  payload?: Record<string, unknown>;
} & Record<string, unknown>;

export type MerchantSuggestionListResponse =
  | {
      items: MerchantSuggestion[];
      total: number;
      limit: number;
      offset: number;
    }
  | MerchantSuggestion[];

export type MerchantSuggestionCreatePayload = Record<string, unknown>;

export interface User {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  payout_channel?: string | null;
  created_at?: string;
  is_active?: boolean;
}

export interface AuthUser extends Omit<User, 'id'> {
  id: number | string;
  full_name?: string;
}

export type EscrowStatus =
  | 'DRAFT'
  | 'FUNDED'
  | 'RELEASABLE'
  | 'RELEASED'
  | 'REFUNDED'
  | 'CANCELLED';

export type EscrowListItem = {
  id: string;
  status: EscrowStatus;
  amount: number;
  currency: string;
  created_at: string;
  updated_at: string;
  client_id?: string | number;
  provider_id?: string | number;
  release_conditions?: string;
  deadline?: string;
  domain?: string;
};

// TODO (docs/FRONTEND_BACKEND_COMPARATIVE_AUDIT.md): Extend payload fields once escrow creation contract is finalized.
export type EscrowCreatePayload = {
  amount: number;
  currency: string;
  description?: string;
};

export type CreateProofPayload = {
  escrow_id: string;
  milestone_id?: string;
  description?: string;
  file_id?: string;
  attachment_url?: string;
};

export type AiAnalysis = {
  ai_risk_level: 'warning' | 'suspect' | null;
  ai_score: number | null;
  ai_explanation: string | null;
  ai_checked_at: string | null;
};

export type ProofStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type ProofDecision = 'approve' | 'reject';

export interface ProofDecisionRequest {
  decision: ProofDecision;
  comment?: string;
}

export type Proof = {
  id: string;
  escrow_id: string;
  milestone_id?: string;
  type?: ProofType;
  description?: string;
  attachment_url?: string;
  file_id?: string;
  file_url?: string;
  status: ProofStatus;
  created_at: string;
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

export type Milestone = {
  id: string;
  name: string;
  status: MilestoneStatus;
  due_date?: string;
};

// Milestone creation payload contract is defined by the backend; use a JSON object to match it.
export type MilestoneCreatePayload = Record<string, unknown>;

export type Payment = {
  id: string;
  escrow_id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  created_at: string;
};

export type SenderEscrowSummary = {
  escrow: EscrowListItem;
  milestones: Milestone[];
  proofs: Proof[];
  payments: Payment[];
};

export type AdminEscrowSummary = SenderEscrowSummary & {
  advisor?: AdvisorProfile | null;
};

export type SenderDashboard = {
  recent_escrows: EscrowListItem[];
  pending_proofs: Proof[];
  recent_payments: Payment[];
};

export interface AuthLoginResponse {
  access_token?: string;
  token?: string;
  user: AuthUser;
}

export interface AuthMeResponse {
  user: AuthUser;
}

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

export interface AdminUserCreateResponse {
  user: AuthUser;
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
  id: string;
  escrow_id: string;
  milestone_name?: string;
  sender_email?: string;
  description?: string;
  type?: ProofType;
  status: ProofStatus;
  created_at: string;
  attachment_url?: string;
  file_id?: string;
  file_url?: string;
  advisor_id?: string;
  advisor_email?: string;
  advisor_name?: string;
} & AiAnalysis;

export type ProofType = 'PHOTO' | 'DOCUMENT';

export interface ProofFileUploadResponse {
  file_id: string;
  file_url?: string;
}

export interface AdvisorProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  blocked: boolean;
  sender_managed: number;
  total_number_of_case_managed: number;
  subscribe_date: string;
  is_active: boolean;
  languages?: string[] | null;
  specialties?: string[] | null;
  country?: string | null;
  load_stats?: {
    open_proofs?: number;
    active_senders?: number;
  };
}

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
  display_name?: string | null;
  first_name: string;
  last_name: string;
  email: string;
  blocked: boolean;
  is_active: boolean;
  sender_managed: number;
  total_number_of_case_managed: number;
  country?: string | null;
  languages?: string[] | null;
  specialties?: string[] | null;
  open_proofs?: number;
  grade?: string | null;
}

export interface AdvisorSenderItem {
  sender_id: number;
  sender_email: string;
  active: boolean;
  assigned_at: string;
}

export interface AiProofSetting {
  bool_value: boolean;
  source?: string | null;
  updated_at?: string | null;
}
