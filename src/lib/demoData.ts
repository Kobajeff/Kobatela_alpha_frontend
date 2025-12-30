import {
  AdminDashboardStats,
  AdminProofReviewItem,
  AdvisorProfile,
  AuthUser,
  EscrowListItem,
  Payment,
  Proof,
  SenderEscrowSummary
} from '@/types/api';
import { DemoRole } from './config';

export const demoSenderUser: AuthUser = {
  id: 1,
  email: 'demo.sender@kobatela.com',
  full_name: 'Demo Sender',
  username: 'demo.sender',
  role: 'sender'
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
  first_name: 'Amina',
  last_name: 'Kouadio',
  email: 'advisor.kouadio@kobatela.com',
  blocked: false,
  sender_managed: 24,
  total_number_of_case_managed: 180,
  subscribe_date: '2024-11-01T00:00:00Z',
  is_active: true,
  languages: ['English', 'Français'],
  specialties: ['Construction oversight', 'Payment scheduling']
};

export const demoEscrows: EscrowListItem[] = [
  {
    id: 'escrow-1',
    status: 'FUNDED',
    amount: 1500,
    currency: 'EUR',
    created_at: '2025-01-10T10:00:00Z',
    updated_at: '2025-01-12T15:30:00Z'
  },
  {
    id: 'escrow-2',
    status: 'RELEASED',
    amount: 800,
    currency: 'EUR',
    created_at: '2025-01-01T09:00:00Z',
    updated_at: '2025-01-05T17:45:00Z'
  },
  {
    id: 'escrow-3',
    status: 'CANCELLED',
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
  .map((p) => ({
    id: p.id,
    escrow_id: p.escrow_id,
    milestone_name: 'Demo milestone',
    sender_email: 'demo.sender@kobatela.com',
    description: p.description,
    attachment_url: p.storage_url,
    status: p.status,
    created_at: p.created_at,
    ai_risk_level: p.ai_risk_level,
    ai_score: p.ai_score,
    ai_explanation: p.ai_explanation,
    ai_checked_at: p.ai_checked_at
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
        label: 'Foundation',
        sequence_index: 1,
        amount: '500.00',
        currency: 'USD',
        status: 'PAID',
        due_date: '2025-01-10T00:00:00Z'
      },
      {
        id: 'm2',
        label: 'Walls',
        sequence_index: 2,
        amount: '1000.00',
        currency: 'USD',
        status: 'PENDING_REVIEW',
        due_date: '2025-02-01T00:00:00Z'
      }
    ],
    proofs,
    payments
  };
}
