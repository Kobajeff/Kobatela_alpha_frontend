import { apiClient } from '@/lib/apiClient';
import { AdminUserCreatePayload, AdminUserCreateResponse } from '@/types/api';

export async function adminCreateUser(
  payload: AdminUserCreatePayload
): Promise<AdminUserCreateResponse> {
  const { data } = await apiClient.post<AdminUserCreateResponse>(
    '/admin/users',
    payload
  );
  return data;
}
