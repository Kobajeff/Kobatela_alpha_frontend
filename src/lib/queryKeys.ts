import type { UIId } from '@/types/id';

export type EscrowSummaryViewer = 'sender' | 'admin' | 'provider';

type ListFilters = Record<string, unknown>;

export const queryKeys = {
  auth: {
    me: () => ['auth', 'me'] as const
  },
  escrows: {
    listBase: () => ['escrows', 'list'] as const,
    list: <T extends ListFilters>(filters: T) => ['escrows', 'list', filters] as const,
    byId: (id: UIId) => ['escrows', id] as const,
    summary: (id: UIId, viewer: EscrowSummaryViewer, params?: Record<string, unknown>) =>
      ['escrows', id, 'summary', viewer, params] as const
  },
  milestones: {
    byEscrow: (escrowId: UIId) => ['milestones', 'byEscrow', escrowId] as const,
    byId: (milestoneId: UIId) => ['milestones', milestoneId] as const
  },
  proofs: {
    listBase: () => ['proofs', 'list'] as const,
    list: <T extends ListFilters>(filters: T) => ['proofs', 'list', filters] as const,
    byId: (proofId: UIId | null) => ['proofs', proofId] as const
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
    },
    merchantRegistry: {
      listBase: () => ['merchantRegistry', 'list'] as const,
      list: (params: Record<string, unknown>) => ['merchantRegistry', 'list', params] as const
    }
  },
  provider: {
    inboxBase: () => ['provider', 'inbox'] as const,
    inbox: <T extends ListFilters>(filters: T) =>
      ['provider', 'inbox', 'escrows', filters] as const
  },
  dashboard: {
    sentEscrowsPreview: <T extends ListFilters>(filters: T) =>
      ['dashboard', 'sent-escrows', filters] as const,
    providerInboxPreview: <T extends ListFilters>(filters: T) =>
      ['dashboard', 'provider-inbox', filters] as const
  },
  external: {
    escrowSummary: (token?: string | null) => ['external', 'escrow', token] as const,
    proofStatus: (proofId?: UIId | null, token?: string | null) =>
      ['external', 'proofStatus', proofId, token] as const
  },
  externalProofTokens: {
    list: (filters: Record<string, unknown>) => ['externalProofTokens', 'list', filters] as const,
    detail: (tokenId?: UIId | null) => ['externalProofTokens', tokenId] as const
  },
  admin: {
    beneficiaryProfile: (beneficiaryProfileId: string) =>
      ['admin', 'beneficiaries', beneficiaryProfileId] as const,
    dashboardStats: () => ['adminDashboardStats', { scope: 'canonical' }] as const,
    alerts: {
      listBase: () => ['admin', 'alerts'] as const,
      list: <T extends ListFilters>(filters: T) => ['admin', 'alerts', filters] as const
    },
    users: {
      list: <T extends ListFilters>(filters: T) => ['admin-users', filters] as const,
      byId: (userId?: string) => ['admin', 'users', userId] as const,
      apiKeysBase: (userId?: string) => ['admin', 'users', userId, 'api-keys'] as const,
      apiKeys: (userId?: string, params?: { active?: boolean }) =>
        ['admin', 'users', userId, 'api-keys', params] as const
    },
    proofReviewQueue: <T extends ListFilters>(filters: T) =>
      ['admin', 'proofs', 'review-queue', filters] as const,
    proofReviewQueueBase: () => ['admin', 'proofs', 'review-queue'] as const,
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
    transactions: {
      listBase: () => ['admin', 'transactions'] as const,
      list: <T extends ListFilters>(filters: T) => ['admin', 'transactions', filters] as const
    },
    spend: {
      allowed: {
        listBase: () => ['admin', 'spend', 'allowed'] as const,
        list: <T extends ListFilters>(filters: T) =>
          ['admin', 'spend', 'allowed', filters] as const
      }
    },
    kctPublic: {
      projectsBase: () => ['admin', 'kct-public', 'projects'] as const,
      projects: <T extends ListFilters>(filters: T) =>
        ['admin', 'kct-public', 'projects', filters] as const
    },
    settings: {
      aiProof: () => ['admin', 'settings', 'ai-proof'] as const
    },
    riskSnapshots: {
      listBase: () => ['admin', 'risk-snapshots'] as const,
      list: <T extends ListFilters>(filters: T) => ['admin', 'risk-snapshots', filters] as const
    },
    fraud: {
      scoreComparison: (proofId?: string) => ['admin', 'fraud', 'score-comparison', proofId] as const
    },
    senders: () => ['admin-senders'] as const,
    pricing: {
      base: () => ['admin', 'pricing'] as const,
      referenceImport: () => ['admin', 'pricing', 'reference-import'] as const,
      inflation: {
        listBase: () => ['admin', 'pricing', 'inflation'] as const,
        list: <T extends ListFilters>(filters: T) =>
          ['admin', 'pricing', 'inflation', filters] as const,
        byId: (id?: UIId | null) => ['admin', 'pricing', 'inflation', id] as const
      }
    }
  }
};
