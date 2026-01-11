import { useMutation } from '@tanstack/react-query';
import { uploadProofFile } from '@/lib/apiClient';
import type { ProofFileUploadResponse } from '@/types/api';

type UploadProofVariables = {
  file: File;
  escrowId?: string;
  onProgress?: (percent: number) => void;
};

export function useUploadProofFile() {
  return useMutation<ProofFileUploadResponse, Error, UploadProofVariables>({
    mutationFn: async ({ file, escrowId, onProgress }) => {
      return uploadProofFile(file, escrowId, onProgress);
    }
  });
}
