import axios from 'axios';
import type {
  ExternalEscrowSummary,
  ExternalProofStatus,
  ExternalProofSubmit,
  ExternalProofSubmitResponse,
  ExternalProofUploadResponse
} from '@/types/api-external';
import { buildExternalAuthHeaders } from '../externalAuth';
import { normalizeApiError } from '../apiError';

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
  const response = await externalApiClient.get<ExternalEscrowSummary>('/external/escrows/summary', {
    ...withToken(token)
  });
  return response.data;
}

export async function getExternalProofStatus(
  token: string,
  proofId: string | number
): Promise<ExternalProofStatus> {
  const response = await externalApiClient.get<ExternalProofStatus>(
    `/external/proofs/${proofId}`,
    withToken(token)
  );
  return response.data;
}

export function mapExternalErrorMessage(error: unknown): string {
  const normalized = normalizeApiError(error);
  if (normalized.code === 'UNSUPPORTED_FILE_TYPE') {
    return 'Format de fichier non pris en charge (jpeg, png ou pdf uniquement).';
  }
  if (normalized.code === 'FILE_TOO_LARGE') {
    return 'Fichier trop volumineux (5 Mo max pour les images, 10 Mo max pour les PDFs).';
  }
  if (normalized.code === 'PROOF_NOT_FOUND') {
    return 'Preuve introuvable pour ce lien sécurisé.';
  }
  if (normalized.status === 401 || normalized.status === 403) {
    return "Lien invalide ou expiré. Demandez un nouveau lien à l’expéditeur.";
  }
  if (normalized.status === 429) {
    return 'Trop de tentatives. Réessayez plus tard.';
  }
  if (normalized.status === 413) {
    return 'Fichier trop volumineux (limite atteinte).';
  }
  return normalized.message;
}
