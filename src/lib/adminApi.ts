import { apiClient, extractErrorMessage, logApiError } from '@/lib/apiClient';
import type {
  AdminAdvisorSummary,
  AdminSender,
  AdminUserCreatePayload,
  AdminUserCreateResponse,
  AiProofSetting,
  ApiKey,
  PaginatedResponse,
  User
} from '@/types/api';

async function withAdminError<T>(action: () => Promise<T>, context: string): Promise<T> {
  try {
    return await action();
  } catch (error) {
    logApiError(error, context);
    throw new Error(extractErrorMessage(error));
  }
}

export async function createAdminUser(
  payload: AdminUserCreatePayload
): Promise<AdminUserCreateResponse> {
  return withAdminError(async () => {
    const { data } = await apiClient.post<AdminUserCreateResponse>('/admin/users', payload);
    return data;
  }, 'POST /admin/users');
}

export async function fetchAdminSenders(params: {
  limit?: number;
  offset?: number;
  q?: string;
}): Promise<PaginatedResponse<AdminSender>> {
  return withAdminError(async () => {
    const { data } = await apiClient.get<PaginatedResponse<AdminSender>>('/admin/senders', {
      params
    });
    return data;
  }, 'GET /admin/senders');
}

export async function fetchApiKeys(params: {
  scope?: string;
  active?: boolean;
  limit?: number;
  offset?: number;
}): Promise<ApiKey[] | PaginatedResponse<ApiKey>> {
  return withAdminError(async () => {
    const { data } = await apiClient.get<ApiKey[] | PaginatedResponse<ApiKey>>('/apikeys', {
      params
    });
    return data;
  }, 'GET /apikeys');
}

export async function deleteApiKey(apiKeyId: string): Promise<void> {
  return withAdminError(async () => {
    await apiClient.delete(`/apikeys/${apiKeyId}`);
  }, 'DELETE /apikeys/{id}');
}

export async function fetchUserProfile(userId: string): Promise<User> {
  return withAdminError(async () => {
    const { data } = await apiClient.get<User>(`/users/${userId}`);
    return data;
  }, 'GET /users/{id}');
}

export async function fetchAdvisorsOverview(): Promise<AdminAdvisorSummary[]> {
  return withAdminError(async () => {
    const { data } = await apiClient.get<AdminAdvisorSummary[]>('/admin/advisors/overview');
    return data;
  }, 'GET /admin/advisors/overview');
}

export async function fetchAiProofSetting(): Promise<AiProofSetting> {
  return withAdminError(async () => {
    const { data } = await apiClient.get<AiProofSetting>('/admin/settings/ai-proof');
    return data;
  }, 'GET /admin/settings/ai-proof');
}

export async function updateAiProofSetting(enabled: boolean): Promise<AiProofSetting> {
  return withAdminError(async () => {
    const { data } = await apiClient.post<AiProofSetting>('/admin/settings/ai-proof', {
      bool_value: enabled
    });
    return data;
  }, 'POST /admin/settings/ai-proof');
}
