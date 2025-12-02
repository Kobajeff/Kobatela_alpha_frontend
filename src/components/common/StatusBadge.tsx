'use client';

import { Badge } from '../ui/Badge';
import {
  mapEscrowStatusToBadge,
  mapPaymentStatusToBadge,
  mapProofStatusToBadge
} from '@/lib/uiMappings';

type StatusType = 'escrow' | 'proof' | 'payment';

type StatusBadgeProps = {
  status: string;
  type: StatusType;
};

const mapperByType: Record<StatusType, (status: string) => { label: string; variant: string }> = {
  escrow: mapEscrowStatusToBadge,
  proof: mapProofStatusToBadge,
  payment: mapPaymentStatusToBadge
};

export function StatusBadge({ status, type }: StatusBadgeProps) {
  const mapper = mapperByType[type];
  const { label, variant } = mapper(status);

  return <Badge variant={variant}>{label}</Badge>;
}
