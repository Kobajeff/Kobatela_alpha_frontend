// Axios client configured for the Kobatela backend with auth header support.
import axios from 'axios';
import type { ProofFileUploadResponse } from '@/types/api';
import { getAuthToken } from './auth';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL
});

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { error?: { message?: string } })?.error?.message;
    if (message) return message;
  }
  return 'Une erreur est survenue';
}

export function isUnauthorizedError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status;
  return status === 401 || status === 403 || status === 404;
}

export async function uploadProofFile(file: File): Promise<ProofFileUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<ProofFileUploadResponse>('/files/proofs', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });

  return response.data;
}
