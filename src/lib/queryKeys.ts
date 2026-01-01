export type EscrowSummaryViewer = 'sender' | 'admin' | 'provider';

type ListFilters = Record<string, unknown>;

export const queryKeys = {
  auth: {
    me: () => ['auth', 'me'] as const
  },
  escrows: {
    listBase: () => ['escrows', 'list'] as const,
    list: <T extends ListFilters>(filters: T) => ['escrows', 'list', filters] as const,
    byId: (id: string) => ['escrows', id] as const,
    summary: (id: string, viewer: EscrowSummaryViewer) =>
      ['escrows', id, 'summary', viewer] as const
  },
  milestones: {
    byEscrow: (escrowId: string) => ['milestones', 'byEscrow', escrowId] as const,
    byId: (milestoneId: string) => ['milestones', milestoneId] as const
  },
  proofs: {
    listBase: () => ['proofs', 'list'] as const,
    list: <T extends ListFilters>(filters: T) => ['proofs', 'list', filters] as const,
    byId: (proofId: string | null) => ['proofs', proofId] as const
  },
  payments: {
    adminListBase: () => ['payments', 'admin'] as const,
    adminList: <T extends ListFilters>(filters: T) => ['payments', 'admin', filters] as const,
    byId: (paymentId: string) => ['payments', paymentId] as const
  },
  advisor: {
    assignedProofs: <T extends ListFilters>(filters: T) => ['advisor', 'proofs', filters] as const,
    profile: () => ['advisor', 'profile'] as const
  },
  uploads: {
    proof: (sha256: string) => ['uploads', 'proof', sha256] as const
  },
  sender: {
    dashboard: () => ['senderDashboard', { scope: 'canonical' }] as const,
    myAdvisor: () => ['myAdvisor'] as const,
    profile: () => ['senderProfile'] as const,
    mandates: {
      base: () => ['mandates'] as const,
      byId: (mandateId?: string | null) => ['mandates', mandateId] as const
    },
    merchantSuggestions: {
      listBase: () => ['merchantSuggestions', 'list'] as const,
      list: (params: Record<string, unknown>) => ['merchantSuggestions', 'list', params] as const,
      byId: (id?: string | null) => ['merchantSuggestions', id] as const
    }
  },
  external: {
    escrowSummary: (token?: string | null) => ['external', 'escrow', token] as const,
    proofStatus: (proofId?: string | number | null, token?: string | null) =>
      ['external', 'proofStatus', proofId, token] as const
  },
  admin: {
    dashboardStats: () => ['adminDashboardStats', { scope: 'canonical' }] as const,
    users: {
      list: <T extends ListFilters>(filters: T) => ['admin-users', filters] as const,
      byId: (userId?: string) => ['admin', 'users', userId] as const,
      apiKeysBase: (userId?: string) => ['admin', 'users', userId, 'api-keys'] as const,
      apiKeys: (userId?: string, params?: { active?: boolean }) =>
        ['admin', 'users', userId, 'api-keys', params] as const
    },
    proofReviewQueue: <T extends ListFilters>(filters: T) =>
      ['adminProofReviewQueue', 'review_queue', filters] as const,
    proofReviewQueueBase: () => ['adminProofReviewQueue'] as const,
    advisors: {
      overview: () => ['admin-advisors-overview'] as const,
      listBase: () => ['admin-advisors'] as const,
      list: <T extends ListFilters>(filters: T) => ['admin-advisors', filters] as const,
      detail: (advisorId: number) => ['admin', 'advisor', advisorId] as const,
      senders: (advisorId: number) => ['admin', 'advisor', advisorId, 'senders'] as const
    },
    merchantSuggestions: {
      listBase: () => ['admin', 'merchantSuggestions'] as const,
      list: <T extends ListFilters>(filters: T) => ['admin', 'merchantSuggestions', filters] as const,
      byId: (suggestionId?: string) => ['admin', 'merchantSuggestions', suggestionId] as const
    },
    settings: {
      aiProof: () => ['admin', 'settings', 'ai-proof'] as const
    },
    senders: () => ['admin-senders'] as const,
    pricing: {
      base: () => ['admin', 'pricing'] as const,
      referenceImport: () => ['admin', 'pricing', 'reference-import'] as const,
      inflation: {
        listBase: () => ['admin', 'pricing', 'inflation'] as const,
        list: <T extends ListFilters>(filters: T) =>
          ['admin', 'pricing', 'inflation', filters] as const,
        byId: (id?: string | number | null) => ['admin', 'pricing', 'inflation', id] as const
      }
    }
  }
};
