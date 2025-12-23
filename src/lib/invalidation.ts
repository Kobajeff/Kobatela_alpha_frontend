import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import type { EscrowSummaryViewer } from './queryKeys';

type EscrowBundleOptions = {
  escrowId: string;
  viewer?: EscrowSummaryViewer;
  refetchSummary?: boolean;
  refetchById?: boolean;
};

type ProofBundleOptions = {
  proofId: string;
  escrowId: string;
  milestoneId?: string | number | null;
  viewer?: EscrowSummaryViewer;
};

const summaryViewers: EscrowSummaryViewer[] = ['sender', 'admin'];

function findProofListQueryKey(queryClient: QueryClient, escrowId: string) {
  const cachedQueries = queryClient.getQueriesData({
    queryKey: queryKeys.proofs.listBase()
  });

  for (const [queryKey] of cachedQueries) {
    const filters = Array.isArray(queryKey) ? queryKey[2] : undefined;
    if (!filters || typeof filters !== 'object') continue;
    if (!('escrow_id' in filters)) continue;
    const escrowFilter = (filters as { escrow_id?: string }).escrow_id;
    if (escrowFilter === escrowId) {
      return queryKey as QueryKey;
    }
  }

  return null;
}

function invalidateEscrowSummaries(
  queryClient: QueryClient,
  escrowId: string,
  viewer?: EscrowSummaryViewer
) {
  const viewers = viewer ? [viewer] : summaryViewers;
  viewers.forEach((entry) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.escrows.summary(escrowId, entry)
    });
  });
}

function refetchEscrowSummaries(
  queryClient: QueryClient,
  escrowId: string,
  viewer?: EscrowSummaryViewer
) {
  const viewers = viewer ? [viewer] : summaryViewers;
  viewers.forEach((entry) => {
    queryClient.refetchQueries({
      queryKey: queryKeys.escrows.summary(escrowId, entry),
      exact: true
    });
  });
}

export function invalidateEscrowBundle(queryClient: QueryClient, options: EscrowBundleOptions) {
  const { escrowId, viewer, refetchSummary, refetchById } = options;

  queryClient.invalidateQueries({ queryKey: queryKeys.escrows.byId(escrowId) });
  invalidateEscrowSummaries(queryClient, escrowId, viewer);
  queryClient.invalidateQueries({ queryKey: queryKeys.milestones.byEscrow(escrowId) });

  const proofListKey = findProofListQueryKey(queryClient, escrowId);
  if (proofListKey) {
    queryClient.invalidateQueries({ queryKey: proofListKey, exact: true });
  } else {
    queryClient.invalidateQueries({ queryKey: queryKeys.proofs.listBase() });
  }

  queryClient.invalidateQueries({ queryKey: queryKeys.escrows.listBase() });

  if (refetchSummary) {
    refetchEscrowSummaries(queryClient, escrowId, viewer);
  }

  if (refetchById) {
    queryClient.refetchQueries({ queryKey: queryKeys.escrows.byId(escrowId), exact: true });
  }
}

export function invalidateProofBundle(queryClient: QueryClient, options: ProofBundleOptions) {
  const { proofId, escrowId, viewer } = options;

  queryClient.invalidateQueries({ queryKey: queryKeys.proofs.byId(proofId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.milestones.byEscrow(escrowId) });
  invalidateEscrowSummaries(queryClient, escrowId, viewer);

  const proofListKey = findProofListQueryKey(queryClient, escrowId);
  if (proofListKey) {
    queryClient.invalidateQueries({ queryKey: proofListKey, exact: true });
  } else {
    queryClient.invalidateQueries({ queryKey: queryKeys.proofs.listBase() });
  }

  queryClient.invalidateQueries({ queryKey: queryKeys.admin.proofReviewQueueBase() });
  queryClient.invalidateQueries({ queryKey: queryKeys.sender.dashboard() });
}

export function invalidateAdminDashboards(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: queryKeys.admin.dashboardStats() });
  queryClient.invalidateQueries({ queryKey: queryKeys.admin.proofReviewQueueBase() });
  queryClient.invalidateQueries({ queryKey: queryKeys.payments.adminListBase() });
}
