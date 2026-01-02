import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { apiClient } from '../apiClient';
import { queryKeys } from '../queryKeys';
import type { GovProjectRead } from '@/types/api';

export interface KctPublicProjectsParams {
  domain?: 'public' | 'aid' | string;
  country?: string;
  status?: string;
}

export function useKctPublicProjects(
  params: KctPublicProjectsParams = {},
  options?: { enabled?: boolean }
) {
  const filters = useMemo(
    () => ({
      domain: params.domain?.trim() || undefined,
      country: params.country?.trim() || undefined,
      status: params.status?.trim() || undefined
    }),
    [params.domain, params.country, params.status]
  );

  return useQuery<GovProjectRead[]>({
    queryKey: queryKeys.admin.kctPublic.projects(filters),
    queryFn: async () => {
      // Contract: docs/Backend_info/API_GUIDE (16).md — GET /kct_public/projects — scopes sender/admin + public user
      const response = await apiClient.get<GovProjectRead[]>('/kct_public/projects', {
        params: filters
      });
      return response.data;
    },
    enabled: options?.enabled ?? true,
    retry: (failureCount, error) => {
      if (isAxiosError(error)) {
        const statusCode = error.response?.status;
        if (statusCode === 401 || statusCode === 403) {
          return false;
        }
      }
      return failureCount < 2;
    }
  });
}
