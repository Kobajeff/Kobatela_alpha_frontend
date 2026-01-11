'use client';

import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { apiClient } from '@/lib/apiClient';
import { isDemoMode } from '@/lib/config';
import { demoProofs } from '@/lib/demoData';
import { queryKeys } from '@/lib/queryKeys';
import type { Proof } from '@/types/api';
import type { ProofUI } from '@/types/ui';
import type { UIId } from '@/types/id';
import { normalizeProof } from '@/lib/normalize';

export function useProofDetail(proofId?: UIId | null) {
  return useQuery<ProofUI, Error>({
    queryKey: queryKeys.proofs.byId(proofId ?? null),
    queryFn: async () => {
      if (!proofId) {
        throw new Error('Identifiant de preuve requis');
      }
      if (isDemoMode()) {
        const proof = demoProofs.find(
          (item) =>
            String(item.id) === String(proofId) ||
            (item.proof_id !== undefined && String(item.proof_id) === String(proofId))
        );
        if (!proof) {
          throw new Error('Preuve introuvable en mode démo');
        }
        return new Promise((resolve) => {
          setTimeout(() => resolve(proof), 200);
        });
      }
      const response = await apiClient.get<Proof>(`/proofs/${proofId}`);
      return normalizeProof(response.data);
    },
    enabled: Boolean(proofId),
    retry: (failureCount, error) => {
      if (isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 403 || status === 404 || status === 410) {
          return false;
        }
      }
      return failureCount < 2;
    }
  });
}
