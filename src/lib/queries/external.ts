import { useMutation, useQuery } from '@tanstack/react-query';
import type { ExternalProofSubmit } from '@/types/api-external';
import {
  getExternalEscrowSummary,
  getExternalProofStatus,
  mapExternalErrorMessage,
  submitExternalProof,
  uploadExternalProofFile
} from '../api/externalClient';
import { sanitizeExternalEscrowSummary, sanitizeExternalProofStatus } from '../externalDisplay';
import { queryKeys } from '../queryKeys';

export function useExternalEscrowSummary(token?: string | null, escrowId?: string | number | null) {
  return useQuery({
    queryKey: queryKeys.external.escrow(escrowId, token),
    queryFn: async () => {
      if (!token || escrowId == null) {
        throw new Error('Token ou identifiant escrow manquant.');
      }
      const response = await getExternalEscrowSummary(token, escrowId);
      return sanitizeExternalEscrowSummary(response);
    },
    enabled: Boolean(token && escrowId)
  });
}

export function useExternalProofUpload(token?: string | null) {
  return useMutation({
    mutationFn: async ({
      file,
      onProgress
    }: {
      file: File;
      onProgress?: (percent: number) => void;
    }) => {
      if (!token) {
        throw new Error('Token requis pour le téléversement.');
      }
      return uploadExternalProofFile(token, file, onProgress);
    },
    onError: (error) => {
      // Surface mapped message via thrown error.
      throw new Error(mapExternalErrorMessage(error));
    }
  });
}

export function useExternalProofSubmit(token?: string | null) {
  return useMutation({
    mutationFn: async (payload: ExternalProofSubmit) => {
      if (!token) {
        throw new Error('Token requis pour la soumission.');
      }
      return submitExternalProof(token, payload);
    },
    onError: (error) => {
      throw new Error(mapExternalErrorMessage(error));
    }
  });
}

export function useExternalProofStatus(token?: string | null, proofId?: string | number | null) {
  return useQuery({
    queryKey: queryKeys.external.proofStatus(proofId, token),
    queryFn: async () => {
      if (!token || proofId == null) {
        throw new Error('Token ou identifiant de preuve manquant.');
      }
      const response = await getExternalProofStatus(token, proofId);
      return sanitizeExternalProofStatus(response);
    },
    enabled: Boolean(token && proofId),
    refetchInterval: (data) => {
      if (!data) return 3000;
      return data.status === 'PENDING' ? 3000 : false;
    }
  });
}
