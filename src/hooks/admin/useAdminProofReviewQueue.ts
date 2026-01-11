import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { isDemoMode } from '@/lib/config';
import { demoAdminProofQueue } from '@/lib/demoData';
import { queryKeys } from '@/lib/queryKeys';
import type { AdminProofReviewItem, PaginatedResponse } from '@/types/api';
import type {
  AdminProofReviewQueueFilters,
  AdminProofReviewQueueResponse
} from '@/backend-contract/types';
import { ADMIN_PROOF_REVIEW_QUEUE_ENDPOINT } from '@/backend-contract/endpoints';

const DEFAULT_LIMIT = 20;

function mapProofReviewQueueItem(item: AdminProofReviewItem): AdminProofReviewItem {
  return {
    proof_id: item.proof_id,
    escrow_id: item.escrow_id,
    milestone_id: item.milestone_id ?? null,
    status: item.status,
    type: item.type,
    storage_key: item.storage_key ?? null,
    storage_url: item.storage_url ?? null,
    sha256: item.sha256 ?? null,
    created_at: item.created_at,
    invoice_total_amount: item.invoice_total_amount ?? null,
    invoice_currency: item.invoice_currency ?? null,
    ai_risk_level: item.ai_risk_level ?? null,
    ai_score: item.ai_score ?? null,
    ai_flags: item.ai_flags ?? null,
    ai_explanation: item.ai_explanation ?? null,
    ai_checked_at: item.ai_checked_at ?? null,
    ai_reviewed_by: item.ai_reviewed_by ?? null,
    ai_reviewed_at: item.ai_reviewed_at ?? null,
    metadata: item.metadata ?? null,
    advisor: item.advisor ?? null,
    payout_eligible: item.payout_eligible ?? null,
    payout_blocked_reasons: item.payout_blocked_reasons ?? null
  };
}

function normalizeProofReviewQueueResponse(
  data: unknown,
  fallbackLimit: number,
  fallbackOffset: number
): AdminProofReviewQueueResponse {
  const response = data as PaginatedResponse<AdminProofReviewItem>;
  const items = Array.isArray(response?.items)
    ? response.items
    : Array.isArray(data)
    ? data
    : [];
  const total = typeof response?.total === 'number' ? response.total : items.length;
  const limit = typeof response?.limit === 'number' ? response.limit : fallbackLimit;
  const offset = typeof response?.offset === 'number' ? response.offset : fallbackOffset;

  return {
    items: items.map(mapProofReviewQueueItem),
    total,
    limit,
    offset
  };
}

export function useAdminProofReviewQueue(
  params: AdminProofReviewQueueFilters = {},
  options?: { enabled?: boolean }
) {
  const {
    limit = DEFAULT_LIMIT,
    offset = 0,
    advisor_id,
    unassigned_only,
    sender_id,
    provider_id,
    review_mode,
    status
  } = params;

  const filters = useMemo(
    () => ({
      limit,
      offset,
      advisor_id,
      unassigned_only,
      sender_id,
      provider_id,
      review_mode,
      status
    }),
    [
      advisor_id,
      limit,
      offset,
      provider_id,
      review_mode,
      sender_id,
      status,
      unassigned_only
    ]
  );

  return useQuery<AdminProofReviewQueueResponse>({
    queryKey: queryKeys.admin.proofReviewQueue(filters),
    queryFn: async () => {
      if (isDemoMode()) {
        return new Promise<AdminProofReviewQueueResponse>((resolve) => {
          setTimeout(
            () =>
              resolve({
                items: demoAdminProofQueue,
                total: demoAdminProofQueue.length,
                limit,
                offset
              }),
            200
          );
        });
      }

      const response = await apiClient.get(ADMIN_PROOF_REVIEW_QUEUE_ENDPOINT, {
        params: {
          limit,
          offset,
          advisor_id,
          unassigned_only,
          sender_id,
          provider_id,
          review_mode,
          status
        }
      });

      return normalizeProofReviewQueueResponse(response.data, limit, offset);
    },
    enabled: options?.enabled ?? true
  });
}
