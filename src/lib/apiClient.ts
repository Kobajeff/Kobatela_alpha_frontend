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
  return axios.isAxiosError(error) && error.response?.status === 401;
}

export async function uploadProofFile(
  file: File,
  onProgress?: (percent: number) => void
): Promise<ProofFileUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<ProofFileUploadResponse>('/files/proofs', formData, {
    headers: {
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
