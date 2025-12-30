import axios from 'axios';
import type {
  ExternalEscrowSummary,
  ExternalProofSubmitPayload,
  ExternalProofSubmitResponse,
  ExternalProofUploadResponse
} from '@/types/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

const externalClient = axios.create({
  baseURL: API_BASE_URL
});

function getExternalHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`
  };
}

export async function uploadExternalProofFile(
  token: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<ExternalProofUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await externalClient.post<ExternalProofUploadResponse>('/external/files/proofs', formData, {
    headers: {
      ...getExternalHeaders(token),
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress: (event) => {
      if (!onProgress || !event.total) return;
      const percent = Math.round((event.loaded * 100) / event.total);
      onProgress(percent);
    }
  });

  return response.data;
}

export async function submitExternalProof(
  token: string,
  payload: ExternalProofSubmitPayload
): Promise<ExternalProofSubmitResponse> {
  const response = await externalClient.post<ExternalProofSubmitResponse>(
    '/external/proofs/submit',
    payload,
    {
      headers: getExternalHeaders(token)
    }
  );
  return response.data;
}

export async function fetchExternalEscrowSummary(
  token: string,
  escrowId: string | number
): Promise<ExternalEscrowSummary> {
  const response = await externalClient.get<ExternalEscrowSummary>(`/external/escrows/${escrowId}`, {
    headers: getExternalHeaders(token)
  });
  return response.data;
}
