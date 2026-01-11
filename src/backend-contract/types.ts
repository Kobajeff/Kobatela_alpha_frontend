import type { PaginatedResponse, ProofStatus } from '@/types/api';
import type { AdminProofReviewItemUI } from '@/types/ui';

export type AdminProofReviewQueueFilters = {
  limit?: number;
  offset?: number;
  advisor_id?: string;
  unassigned_only?: boolean;
  sender_id?: string;
  provider_id?: string;
  review_mode?: string;
  status?: ProofStatus | string;
};

export type AdminProofReviewQueueResponse = PaginatedResponse<AdminProofReviewItemUI>;
