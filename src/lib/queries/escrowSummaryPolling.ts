import type { SenderEscrowSummary } from '@/types/api';

const TERMINAL_ESCROW_STATUSES = new Set([
  'FUNDED',
  'RELEASABLE',
  'REFUNDED',
  'CANCELLED'
]);

const ACTIVE_MILESTONE_STATUSES = new Set(['PENDING_REVIEW', 'PAYING']);

const TERMINAL_PAYMENT_STATUSES = new Set(['SETTLED', 'ERROR', 'REFUNDED']);

export type EscrowSummaryPollingFlags = {
  fundingActive: boolean;
  milestoneActive: boolean;
  payoutActive: boolean;
};

export function getEscrowSummaryPollingFlags(
  summary?: SenderEscrowSummary,
  options?: { fundingInProgress?: boolean }
): EscrowSummaryPollingFlags {
  if (!summary) {
    return { fundingActive: false, milestoneActive: false, payoutActive: false };
  }

  const status = summary.escrow?.status?.toUpperCase();
  const fundingContext = options?.fundingInProgress ?? status === 'DRAFT';
  const fundingActive = Boolean(
    status && !TERMINAL_ESCROW_STATUSES.has(status) && fundingContext
  );

  const milestoneActive = summary.milestones?.some((milestone) =>
    ACTIVE_MILESTONE_STATUSES.has(String(milestone.status).toUpperCase())
  );

  const payoutActive = summary.payments?.some(
    (payment) =>
      !TERMINAL_PAYMENT_STATUSES.has(String(payment.status).toUpperCase())
  );

  return { fundingActive, milestoneActive, payoutActive };
}
