import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, extractErrorMessage } from '@/lib/apiClient';
import { invalidateProofBundle } from '@/lib/invalidation';
import { queryKeys } from '@/lib/queryKeys';
import type { EscrowSummaryViewer } from '@/lib/queryKeys';
import type { CreateProofPayload, Proof } from '@/types/api';
import { isDemoMode } from '@/lib/config';

type UseSubmitProofOptions = {
  viewer?: EscrowSummaryViewer;
};

export function useSubmitProof(options?: UseSubmitProofOptions) {
  const queryClient = useQueryClient();
  const viewer = options?.viewer ?? 'sender';

  return useMutation<Proof, Error, CreateProofPayload>({
    mutationFn: async (payload) => {
      if (isDemoMode()) {
        const now = new Date().toISOString();
        return {
          id: `demo-proof-${Date.now()}`,
          escrow_id: payload.escrow_id,
          milestone_idx: payload.milestone_idx,
          type: payload.type,
          storage_key: payload.storage_key,
          storage_url: payload.storage_url,
          sha256: payload.sha256,
          metadata: payload.metadata,
          file_id: 'demo-file-id',
          status: 'PENDING',
          created_at: now,
          ai_risk_level: null,
          ai_score: null,
          ai_explanation: null,
          ai_checked_at: null
        };
      }
      const response = await apiClient.post<Proof>('/proofs', payload);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.proofs.byId(data.id), data);
      invalidateProofBundle(queryClient, {
        proofId: data.id,
        escrowId: data.escrow_id,
        milestoneId: data.milestone_id,
        viewer
      });
    },
    onError: (error) => {
      throw new Error(extractErrorMessage(error));
    }
  });
}
