import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { ExternalProofSubmit } from '@/types/api-external';
import {
  getExternalEscrowSummary,
  getExternalProofStatus,
  submitExternalProof,
  uploadExternalProofFile
} from '../api/externalClient';
import { mapExternalErrorMessage } from '../external/externalErrorMessages';
import { sanitizeExternalEscrowSummary, sanitizeExternalProofStatus } from '../externalDisplay';
import { queryKeys } from '../queryKeys';
import { normalizeApiError } from '../apiError';
import { isTerminalStatus } from '../external/externalProofStatuses';

export function useExternalEscrowSummary(token?: string | null) {
  return useQuery({
    queryKey: queryKeys.external.escrowSummary(token),
    queryFn: async () => {
      if (!token) {
        throw new Error('Token manquant.');
      }
      const response = await getExternalEscrowSummary(token);
      return sanitizeExternalEscrowSummary(response);
    },
    enabled: Boolean(token)
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
    }
  });
}

export function useExternalProofStatus(token?: string | null, proofId?: string | number | null) {
  const intervalRef = useRef(3000);
  const consecutiveErrorRef = useRef(0);
  const [stoppedReason, setStoppedReason] = useState<string | null>(null);
  const [lastAuthErrorStatus, setLastAuthErrorStatus] = useState<number | null>(null);

  useEffect(() => {
    intervalRef.current = 3000;
    consecutiveErrorRef.current = 0;
    setStoppedReason(null);
    setLastAuthErrorStatus(null);
  }, [proofId, token]);

  const query = useQuery({
    queryKey: queryKeys.external.proofStatus(proofId, token),
    queryFn: async () => {
      if (!token || proofId == null) {
        throw new Error('Token ou identifiant de preuve manquant.');
      }
      const response = await getExternalProofStatus(token, proofId);
      consecutiveErrorRef.current = 0;
      setLastAuthErrorStatus(null);
      return sanitizeExternalProofStatus(response);
    },
    enabled: Boolean(token && proofId),
    refetchInterval: (query) => {
      const data = query.state.data;
      const error = query.state.error as unknown;
      const hasTerminalStatus =
        (data?.terminal ?? false) || isTerminalStatus((data as { status?: string })?.status);

      // Stop polling on terminal proof status.
      if (hasTerminalStatus) return false;

      // Stop polling when auth/link issues occur.
      const normalizedError = error ? normalizeApiError(error) : null;
      if (normalizedError?.status && [401, 403, 404, 410].includes(normalizedError.status)) {
        setStoppedReason(mapExternalErrorMessage(error));
        setLastAuthErrorStatus(normalizedError.status);
        return false;
      }

      // Exponential-ish backoff with cap and stop after repeated failures.
      if (normalizedError) {
        consecutiveErrorRef.current += 1;
      }
      const baseInterval = intervalRef.current;
      const next = Math.min(10000, Math.max(3000, Math.round(baseInterval * 1.5)));
      intervalRef.current = next;
      if (consecutiveErrorRef.current >= 5) {
        setStoppedReason(
          'Impossible de mettre à jour le statut après plusieurs tentatives. Réessayez plus tard.'
        );
        return false;
      }
      return next;
    }
  });

  return { ...query, stoppedReason, lastAuthErrorStatus };
}
