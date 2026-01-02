import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';

export function afterProofUpload(
  queryClient: QueryClient,
  escrowId: string,
  proofId?: string
) {
  queryClient.invalidateQueries({ queryKey: queryKeys.proofs.listBase() });
  if (proofId) {
    queryClient.invalidateQueries({ queryKey: queryKeys.proofs.byId(proofId) });
  }
  queryClient.invalidateQueries({ queryKey: queryKeys.milestones.byEscrow(escrowId) });
  queryClient.invalidateQueries({
    predicate: (query) =>
      Array.isArray(query.queryKey) &&
      query.queryKey[0] === 'escrows' &&
      query.queryKey[1] === escrowId &&
      query.queryKey[2] === 'summary'
  });
  queryClient.invalidateQueries({ queryKey: queryKeys.admin.proofReviewQueueBase() });
  queryClient.invalidateQueries({ queryKey: queryKeys.sender.dashboard() });
}

export function afterProofDecision(queryClient: QueryClient, escrowId: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.admin.proofReviewQueueBase() });
  queryClient.invalidateQueries({
    predicate: (query) =>
      Array.isArray(query.queryKey) &&
      query.queryKey[0] === 'escrows' &&
      query.queryKey[1] === escrowId &&
      query.queryKey[2] === 'summary'
  });
  queryClient.invalidateQueries({ queryKey: queryKeys.sender.dashboard() });
}

export function afterPayout(
  queryClient: QueryClient,
  escrowId: string,
  _paymentId?: string
) {
  invalidateEscrowSummary(queryClient, escrowId);
  queryClient.invalidateQueries({ queryKey: queryKeys.sender.dashboard() });
}

export function invalidateEscrowSummary(queryClient: QueryClient, escrowId: string) {
  queryClient.invalidateQueries({
    predicate: (query) =>
      Array.isArray(query.queryKey) &&
      query.queryKey[0] === 'escrows' &&
      query.queryKey[1] === escrowId &&
      query.queryKey[2] === 'summary'
  });
  queryClient.invalidateQueries({ queryKey: queryKeys.milestones.byEscrow(escrowId) });
}
