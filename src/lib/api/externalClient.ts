import axios from 'axios';
import type {
  ExternalEscrowSummary,
  ExternalProofStatus,
  ExternalProofSubmit,
  ExternalProofSubmitResponse,
  ExternalProofUploadResponse
} from '@/types/api-external';
import { buildExternalAuthHeaders } from '../externalAuth';
import { mapExternalErrorMessage } from '../external/externalErrorMessages';

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

  try {
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
  } catch (error) {
    throw new Error(mapExternalErrorMessage(error));
  }
}

export async function submitExternalProof(
  token: string,
  payload: ExternalProofSubmit
): Promise<ExternalProofSubmitResponse> {
  try {
    const response = await externalApiClient.post<ExternalProofSubmitResponse>(
      '/external/proofs/submit',
      payload,
      withToken(token)
    );
    return response.data;
  } catch (error) {
    throw new Error(mapExternalErrorMessage(error));
  }
}

export async function getExternalEscrowSummary(
  token: string
): Promise<ExternalEscrowSummary> {
  try {
    const response = await externalApiClient.get<ExternalEscrowSummary>(
      '/external/escrows/summary',
      {
        ...withToken(token)
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(mapExternalErrorMessage(error));
  }
}

export async function getExternalProofStatus(
  token: string,
  proofId: string | number
): Promise<ExternalProofStatus> {
  try {
    const response = await externalApiClient.get<ExternalProofStatus>(
      `/external/proofs/${proofId}`,
      withToken(token)
    );
    return response.data;
  } catch (error) {
    throw new Error(mapExternalErrorMessage(error));
  }
}
