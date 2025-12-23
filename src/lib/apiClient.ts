// Axios client configured for the Kobatela backend with auth header support.
import axios from 'axios';
import type { ProofFileUploadResponse } from '@/types/api';
import { normalizeApiError } from './apiError';
import { getAuthToken } from './auth';
import { getQueryClient } from './queryClient';
import { resetSession } from './sessionReset';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL
});

let isResettingSession = false;

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = normalizeApiError(error).status;
    if (status === 401 && !isResettingSession) {
      isResettingSession = true;
      resetSession(getQueryClient());
    }
    return Promise.reject(error);
  }
);

export function extractErrorMessage(error: unknown): string {
  return normalizeApiError(error).message;
}

export function isUnauthorizedError(error: unknown): boolean {
  const status = normalizeApiError(error).status;
  return status === 401;
}

export function isForbiddenError(error: unknown): boolean {
  const status = normalizeApiError(error).status;
  return status === 403;
}

export function isNotFoundError(error: unknown): boolean {
  const status = normalizeApiError(error).status;
  return status === 404;
}

export function isGoneError(error: unknown): boolean {
  const status = normalizeApiError(error).status;
  return status === 410;
}

export function logApiError(error: unknown, context?: string) {
  if (process.env.NODE_ENV !== "development") return;

  if (axios.isAxiosError(error)) {
    console.error("[API ERROR]", context, {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data
    });
  } else if (error instanceof Error) {
    console.error("[APP ERROR]", context, error.message, error);
  } else {
    console.error("[UNKNOWN ERROR]", context, error);
  }
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
