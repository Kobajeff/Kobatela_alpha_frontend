import { apiClient, extractErrorMessage, logApiError } from '@/lib/apiClient';
import type {
  AdminAdvisorSummary,
  AdminUserCreatePayload,
  AdminUserCreateResponse,
  AdminSettingRead,
  ApiKey,
  PaginatedResponse,
  UserCreatePayload,
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

export async function createUser(payload: UserCreatePayload): Promise<User> {
  return withAdminError(async () => {
    const { data } = await apiClient.post<User>('/users', payload);
    return data;
  }, 'POST /users');
}

export async function getAdminUsers(params: {
  role?: string;
  q?: string;
  limit?: number;
  offset?: number;
  active?: boolean;
}): Promise<PaginatedResponse<User>> {
  return withAdminError(async () => {
    const { data } = await apiClient.get<PaginatedResponse<User>>('/admin/users', {
      params
    });
    return data;
  }, 'GET /admin/users');
}

export async function getAdminUserById(userId: string): Promise<User> {
  return withAdminError(async () => {
    const { data } = await apiClient.get<User>(`/admin/users/${userId}`);
    return data;
  }, 'GET /admin/users/{id}');
}

export async function getAdminUserApiKeys(
  userId: string,
  params?: { active?: boolean }
): Promise<ApiKey[] | PaginatedResponse<ApiKey>> {
  return withAdminError(async () => {
    const { data } = await apiClient.get<ApiKey[] | PaginatedResponse<ApiKey>>(
      `/admin/users/${userId}/api-keys`,
      {
        params
      }
    );
    return data;
  }, 'GET /admin/users/{id}/api-keys');
}

export async function issueAdminUserApiKey(
  userId: string,
  payload?: { name?: string }
): Promise<ApiKey> {
  return withAdminError(async () => {
    const { data } = await apiClient.post<ApiKey>(
      `/admin/users/${userId}/api-keys`,
      payload ?? {}
    );
    return data;
  }, 'POST /admin/users/{id}/api-keys');
}

export async function revokeAdminUserApiKey(
  userId: string,
  apiKeyId: string
): Promise<void> {
  return withAdminError(async () => {
    await apiClient.delete(`/admin/users/${userId}/api-keys/${apiKeyId}`);
  }, 'DELETE /admin/users/{id}/api-keys/{apiKeyId}');
}

export async function fetchAdvisorsOverview(): Promise<AdminAdvisorSummary[]> {
  return withAdminError(async () => {
    const { data } = await apiClient.get<AdminAdvisorSummary[]>('/admin/advisors/overview');
    return data;
  }, 'GET /admin/advisors/overview');
}

export async function fetchAiProofSetting(): Promise<AdminSettingRead> {
  return withAdminError(async () => {
    const { data } = await apiClient.get<AdminSettingRead>('/admin/settings/ai-proof');
    return data;
  }, 'GET /admin/settings/ai-proof');
}

export async function updateAiProofSetting(enabled: boolean): Promise<AdminSettingRead> {
  return withAdminError(async () => {
    const { data } = await apiClient.post<AdminSettingRead>('/admin/settings/ai-proof', null, {
      params: { enabled }
    });
    return data;
  }, 'POST /admin/settings/ai-proof');
}
