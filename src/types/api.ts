// TypeScript interfaces describing API payloads exchanged with the Kobatela backend.
export type UserRole = 'sender' | 'admin' | 'advisor';

export type UserMe = {
  id: string;
  email: string;
  full_name?: string;
  role: UserRole;
};

export type EscrowStatus =
  | 'draft'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'disputed'
  | 'expired';

export type EscrowListItem = {
  id: string;
  status: EscrowStatus;
  amount: number;
  currency: string;
  created_at: string;
  updated_at: string;
};

export type CreateProofPayload = {
  escrow_id: string;
  milestone_id?: string;
  type?: ProofType;
  storage_url?: string;
  sha256?: string;
  content_type?: string;
  size_bytes?: number;
  description?: string;
  attachment_url?: string;
};

export type ProofStatus = 'pending' | 'approved' | 'rejected';

export type Proof = {
  id: string;
  escrow_id: string;
  milestone_id?: string;
  type?: ProofType;
  storage_url?: string;
  sha256?: string;
  content_type?: string;
  size_bytes?: number;
  description?: string;
  attachment_url?: string;
  status: ProofStatus;
  created_at: string;

  // AI-related
  ai_risk_level: string | null;
  ai_score: string | number | null;
  ai_flags: string[] | null;
  ai_explanation: string | null;
  ai_checked_at: string | null;
};

export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'refunded';

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
  milestones: Array<{
    id: string;
    name: string;
    status: string;
    due_date?: string;
  }>;
  proofs: Proof[];
  payments: Payment[];
};

export type SenderDashboard = {
  recentEscrows: EscrowListItem[];
  pendingProofs: Proof[];
  recentPayments: Payment[];
};

export type LoginResponse = {
  token: string;
};

export type AdminDashboardStats = {
  total_escrows: number;
  pending_proofs: number;
  approved_proofs: number;
  rejected_proofs: number;
  total_payments: number;
};

export type AdminProofReviewItem = {
  id: string;
  escrow_id: string;
  milestone_name?: string;
  sender_email?: string;
  description?: string;
  type?: ProofType;
  storage_url?: string;
  sha256?: string;
  attachment_url?: string;
  status: ProofStatus;
  created_at: string;

  // AI-related
  ai_risk_level: string | null;
  ai_score: string | number | null;
  ai_flags: string[] | null;
  ai_explanation: string | null;
  ai_checked_at: string | null;
};

export type ProofType = 'PHOTO' | 'DOCUMENT';

export interface ProofFileUploadResponse {
  storage_url: string;
  sha256: string;
  content_type: string;
  size_bytes: number;
}

export interface AdvisorProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  sender_managed: number;
  total_number_of_case_managed: number;
  subscribe_date: string;
  is_active: boolean;
  languages?: string[] | null;
  specialties?: string[] | null;
}

export interface AdminAdvisorSummary {
  advisor_id: string;
  full_name: string;
  active_senders: number;
  open_proofs: number;
  total_cases: number;
}

export interface AdminAdvisorListItem {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  sender_managed: number;
  total_number_of_case_managed: number;
  languages?: string[] | null;
  specialties?: string[] | null;
}

export interface AiProofSetting {
  key: string;
  bool_value: boolean;
  source?: string | null;
  updated_at?: string | null;
}
