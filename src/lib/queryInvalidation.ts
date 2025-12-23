import type { QueryClient } from '@tanstack/react-query';

export function afterProofUpload(
  queryClient: QueryClient,
  escrowId: string,
  proofId?: string
) {
  queryClient.invalidateQueries({ queryKey: ['proofs'] });
  if (proofId) {
    queryClient.invalidateQueries({ queryKey: ['proof', proofId] });
  }
  queryClient.invalidateQueries({ queryKey: ['escrowMilestones', escrowId] });
  queryClient.invalidateQueries({ queryKey: ['escrowSummary', escrowId] });
  queryClient.invalidateQueries({ queryKey: ['adminEscrowSummary', escrowId] });
  queryClient.invalidateQueries({ queryKey: ['adminProofReviewQueue'] });
  queryClient.invalidateQueries({ queryKey: ['senderDashboard'] });
}

export function afterProofDecision(queryClient: QueryClient, escrowId: string) {
  queryClient.invalidateQueries({ queryKey: ['adminProofReviewQueue'] });
  queryClient.invalidateQueries({ queryKey: ['adminEscrowSummary', escrowId] });
  queryClient.invalidateQueries({ queryKey: ['escrowSummary', escrowId] });
  queryClient.invalidateQueries({ queryKey: ['senderDashboard'] });
}

export function afterPayout(
  queryClient: QueryClient,
  escrowId: string,
  _paymentId?: string
) {
  invalidateEscrowSummary(queryClient, escrowId);
  queryClient.invalidateQueries({ queryKey: ['senderDashboard'] });
}

export function invalidateEscrowSummary(queryClient: QueryClient, escrowId: string) {
  queryClient.invalidateQueries({ queryKey: ['escrowSummary', escrowId] });
  queryClient.invalidateQueries({ queryKey: ['adminEscrowSummary', escrowId] });
}
