// TypeScript interfaces describing API payloads exchanged with the Kobatela backend.
export type UserMe = {
  id: string;
  email: string;
  full_name?: string;
  role?: 'sender' | 'admin' | 'advisor';
};

export type EscrowListItem = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  created_at: string;
  updated_at: string;
};

export type Proof = {
  id: string;
  escrow_id: string;
  description?: string;
  created_at: string;
};

export type Payment = {
  id: string;
  escrow_id: string;
  amount: number;
  currency: string;
  status: string;
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
