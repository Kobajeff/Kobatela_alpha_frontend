'use client';

import { Badge } from '../ui/Badge';
import type { BadgeProps } from '../ui/Badge';
import type { EscrowStatus, PaymentStatus, ProofStatus } from '@/types/api';

type StatusType = 'escrow' | 'proof' | 'payment';

type StatusBadgeProps = {
  status: string;
  type: StatusType;
};

const ESCROW_LABELS: Record<EscrowStatus, { label: string; variant: BadgeProps['variant'] }> = {
  draft: { label: 'Brouillon', variant: 'default' },
  active: { label: 'Actif', variant: 'info' },
  completed: { label: 'Terminé', variant: 'success' },
  cancelled: { label: 'Annulé', variant: 'danger' },
  disputed: { label: 'En litige', variant: 'warning' },
  expired: { label: 'Expiré', variant: 'danger' }
};

const PROOF_LABELS: Record<ProofStatus, { label: string; variant: BadgeProps['variant'] }> = {
  pending: { label: 'En attente', variant: 'info' },
  approved: { label: 'Approuvée', variant: 'success' },
  rejected: { label: 'Rejetée', variant: 'danger' }
};

const PAYMENT_LABELS: Record<PaymentStatus, { label: string; variant: BadgeProps['variant'] }> = {
  pending: { label: 'En attente', variant: 'info' },
  processing: { label: 'En cours', variant: 'warning' },
  paid: { label: 'Payé', variant: 'success' },
  failed: { label: 'Échec', variant: 'danger' },
  refunded: { label: 'Remboursé', variant: 'default' }
};

const LABELS: Record<StatusType, Record<string, { label: string; variant: BadgeProps['variant'] }>> = {
  escrow: ESCROW_LABELS,
  proof: PROOF_LABELS,
  payment: PAYMENT_LABELS
};

export function StatusBadge({ status, type }: StatusBadgeProps) {
  const mapping = LABELS[type];
  const normalized = status as keyof typeof mapping;
  const fallback = { label: status, variant: 'default' as const };
  const { label, variant } = mapping[normalized] ?? fallback;

  return <Badge variant={variant}>{label}</Badge>;
}
