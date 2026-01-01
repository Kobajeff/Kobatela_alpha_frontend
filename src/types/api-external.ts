import type { ProofType, ProofStatus } from './api';

/** External-facing escrow summary (redacted, token-scoped). */
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

/** Response returned by POST /external/files/proofs. */
export type ExternalProofUploadResponse = {
  storage_key: string;
  storage_url: string;
  sha256: string;
  content_type: string;
  size_bytes: number;
  escrow_id: number | string;
  milestone_idx: number;
};

/** Payload sent to POST /external/proofs/submit. */
export type ExternalProofSubmit = {
  escrow_id: number | string;
  milestone_idx: number;
  type: ProofType;
  storage_key: string;
  storage_url: string;
  sha256: string;
  metadata?: Record<string, unknown>;
};

/** Response returned after submitting or reading an external proof. */
export type ExternalProofSubmitResponse = {
  proof_id: number | string;
  status: ProofStatus;
  escrow_id: number | string;
  milestone_idx: number;
  created_at: string;
};

/** Proof status payload for polling. */
export type ExternalProofStatus = {
  proof_id: number | string;
  status: ProofStatus;
  escrow_id: number | string;
  milestone_idx: number;
  terminal: boolean;
  submitted_at: string;
  reviewed_at?: string | null;
};
