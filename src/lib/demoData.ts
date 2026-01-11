import {
  AdminDashboardStats,
  AdminProofReviewItem,
  AdvisorProfile,
  EscrowListItem,
  Payment,
  Proof,
  SenderEscrowSummary,
  UserProfile
} from '@/types/api';
import type { AuthUser } from '@/types/auth';
import { DemoRole } from './config';

export const demoSenderUser: AuthUser = {
  id: 1,
  email: 'demo.sender@kobatela.com',
  full_name: 'Demo Sender',
  username: 'demo.sender',
  role: 'user'
};

export const demoAdminUser: AuthUser = {
  id: 2,
  email: 'demo.admin@kobatela.com',
  full_name: 'Demo Admin',
  username: 'demo.admin',
  role: 'admin'
};

export const demoAdvisorProfile: AdvisorProfile = {
  id: 'advisor-1',
  user_id: 'advisor-user-1',
  advisor_id: 'ADV-000001',
  first_name: 'Amina',
  last_name: 'Kouadio',
  email: 'advisor.kouadio@kobatela.com',
  phone: '+2250102030405',
  country: 'CI',
  language: 'fr',
  advisor_grade: 'Senior',
  short_description: 'Accompanies infrastructure projects and proof reviews.',
  blocked: false,
  sender_managed: 24,
  total_number_of_case_managed: 180,
  subscribe_date: '2024-11-01T00:00:00Z',
  is_active: true
};

export const demoUserProfile: UserProfile = {
  first_name: 'Demo',
  last_name: 'Sender',
  email: 'demo.sender@kobatela.com',
  phone: '+2250102030406',
  address_line1: '1 Rue Demo',
  city: 'Abidjan',
  postal_code: 'BP 123',
  country_code: 'CI',
  spoken_languages: ['fr', 'en'],
  residence_region: 'Abidjan',
  habitual_send_region: 'West Africa'
};

export const demoEscrows: EscrowListItem[] = [
  {
    id: 'escrow-1',
    status: 'FUNDED',
    amount_total: '1500',
    amount: 1500,
    currency: 'EUR',
    created_at: '2025-01-10T10:00:00Z',
    updated_at: '2025-01-12T15:30:00Z'
  },
  {
    id: 'escrow-2',
    status: 'RELEASED',
    amount_total: '800',
    amount: 800,
    currency: 'EUR',
    created_at: '2025-01-01T09:00:00Z',
    updated_at: '2025-01-05T17:45:00Z'
  },
  {
    id: 'escrow-3',
    status: 'CANCELLED',
    amount_total: '2200',
    amount: 2200,
    currency: 'EUR',
    created_at: '2025-01-05T12:00:00Z',
    updated_at: '2025-01-07T14:20:00Z'
  }
];

export const demoProofs: Proof[] = [
  {
    id: 'proof-1',
    escrow_id: 'escrow-1',
    milestone_id: 'm1',
    milestone_idx: 1,
    type: 'PHOTO',
    storage_key: 'proofs/demo/foundation.jpg',
    storage_url: 'https://example.com/foundation.jpg',
    sha256: 'demo-sha-1',
    metadata: { note: 'Picture of foundation work' },
    status: 'PENDING',
    created_at: '2025-01-11T08:30:00Z',
    ai_risk_level: null,
    ai_score: 0.12,
    ai_explanation: 'Image appears authentic with no detected anomalies.',
    ai_checked_at: '2025-01-11T09:00:00Z'
  },
  {
    id: 'proof-2',
    escrow_id: 'escrow-2',
    milestone_id: 'm1',
    milestone_idx: 1,
    type: 'DOCUMENT',
    storage_key: 'proofs/demo/invoice.pdf',
    storage_url: 'https://example.com/invoice.pdf',
    sha256: 'demo-sha-2',
    metadata: { note: 'Invoice for materials' },
    status: 'APPROVED',
    created_at: '2025-01-02T16:00:00Z',
    ai_risk_level: 'warning',
    ai_score: 0.52,
    ai_explanation: 'Detected minor inconsistency in metadata; manual review advised.',
    ai_checked_at: '2025-01-02T16:30:00Z'
  }
];

export const demoPayments: Payment[] = [
  {
    id: 'payment-1',
    escrow_id: 'escrow-2',
    amount: 800,
    currency: 'EUR',
    status: 'SETTLED',
    created_at: '2025-01-05T18:00:00Z'
  }
];

export const demoSenderDashboard: SenderEscrowSummary[] = [];

export const demoAdminStats: AdminDashboardStats = {
  total_escrows: demoEscrows.length,
  pending_proofs: demoProofs.filter((p) => p.status === 'PENDING').length,
  approved_proofs: demoProofs.filter((p) => p.status === 'APPROVED').length,
  rejected_proofs: demoProofs.filter((p) => p.status === 'REJECTED').length,
  total_payments: demoPayments.length
};

export const demoAdminProofQueue: AdminProofReviewItem[] = demoProofs
  .filter((p) => p.status === 'PENDING')
  .map((p, index) => ({
    proof_id: index + 1,
    escrow_id: index + 1,
    milestone_id: p.milestone_id ? index + 1 : null,
    status: p.status,
    type: p.type ?? 'PHOTO',
    storage_key: p.storage_key ?? null,
    storage_url: p.storage_url ?? null,
    sha256: p.sha256 ?? null,
    created_at: p.created_at,
    invoice_total_amount:
      p.invoice_total_amount !== undefined && p.invoice_total_amount !== null
        ? String(p.invoice_total_amount)
        : null,
    invoice_currency: p.invoice_currency ?? null,
    ai_risk_level: p.ai_risk_level,
    ai_score: p.ai_score,
    ai_flags: p.ai_flags ?? null,
    ai_explanation: p.ai_explanation,
    ai_checked_at: p.ai_checked_at,
    ai_reviewed_by: p.ai_reviewed_by ?? null,
    ai_reviewed_at: p.ai_reviewed_at ?? null,
    metadata: p.metadata ?? null,
    advisor: null,
    payout_eligible: p.payout_eligible ?? null,
    payout_blocked_reasons: p.payout_blocked_reasons ?? null
  }));

export function getDemoUserByRole(role: DemoRole): AuthUser {
  return role === 'admin' ? demoAdminUser : demoSenderUser;
}

export function getDemoEscrowSummary(escrowId: string): SenderEscrowSummary | null {
  const escrow = demoEscrows.find((e) => e.id === escrowId);
  if (!escrow) return null;

  const proofs = demoProofs.filter((p) => p.escrow_id === escrowId);
  const payments = demoPayments.filter((p) => p.escrow_id === escrowId);

  return {
    escrow,
    milestones: [
      {
        id: 'm1',
        escrow_id: escrowId,
        label: 'Foundation',
        sequence_index: 1,
        amount: '500.00',
        currency: 'USD',
        status: 'PAID',
        due_date: '2025-01-10T00:00:00Z'
      },
      {
        id: 'm2',
        escrow_id: escrowId,
        label: 'Walls',
        sequence_index: 2,
        amount: '1000.00',
        currency: 'USD',
        status: 'PENDING_REVIEW',
        due_date: '2025-02-01T00:00:00Z'
      }
    ],
    proofs,
    payments,
    viewer_context: {
      relation: 'SENDER',
      allowed_actions: ['VIEW_SUMMARY', 'VIEW_MILESTONES', 'VIEW_PROOFS'],
      is_sender: true,
      is_provider: false,
      is_participant: false,
      viewer_user_id: 1
    },
    current_submittable_milestone_id: null,
    current_submittable_milestone_idx: null
  };
}
