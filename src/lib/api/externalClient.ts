import axios from 'axios';
import type {
  ExternalEscrowSummary,
  ExternalProofStatus,
  ExternalProofSubmit,
  ExternalProofSubmitResponse,
  ExternalProofUploadResponse
} from '@/types/api-external';
import { buildExternalAuthHeaders } from '../externalAuth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

export const externalApiClient = axios.create({
  baseURL: API_BASE_URL
});

function withToken(token: string) {
  return {
    headers: buildExternalAuthHeaders(token)
  };
}

export async function uploadExternalProofFile(
  token: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<ExternalProofUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await externalApiClient.post<ExternalProofUploadResponse>(
    '/external/files/proofs',
    formData,
    {
      headers: {
        ...withToken(token).headers,
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (event) => {
        if (!onProgress || !event.total) return;
        const percent = Math.round((event.loaded * 100) / event.total);
        onProgress(percent);
      }
    }
  );
  return response.data;
}

export async function submitExternalProof(
  token: string,
  payload: ExternalProofSubmit
): Promise<ExternalProofSubmitResponse> {
  const response = await externalApiClient.post<ExternalProofSubmitResponse>(
    '/external/proofs/submit',
    payload,
    withToken(token)
  );
  return response.data;
}

export async function getExternalEscrowSummary(
  token: string
): Promise<ExternalEscrowSummary> {
  const response = await externalApiClient.get<ExternalEscrowSummary>(
    '/external/escrows/summary',
    {
      ...withToken(token)
    }
  );
  return response.data;
}

export async function getExternalProofStatus(
  token: string,
  proofId: string | number
): Promise<ExternalProofStatus> {
  const response = await externalApiClient.get<ExternalProofStatus>(
    `/external/proofs/${proofId}/status`,
    withToken(token)
  );
  return response.data;
}
