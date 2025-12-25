import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, extractErrorMessage } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { buildQueryString, getPaginatedLimitOffset, getPaginatedTotal, normalizePaginatedItems } from '@/lib/queries/queryUtils';
import type {
  InflationAdjustment,
  InflationAdjustmentCreatePayload,
  InflationAdjustmentListResponse,
  InflationAdjustmentUpdatePayload
} from '@/types/api';

const PRICING_SCOPE_ERRORS = [401, 403, 409, 422];

function shouldRetry(status?: number | null) {
  if (!status) return true;
  return !PRICING_SCOPE_ERRORS.includes(status);
}

export async function uploadReferenceCsv(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post('/admin/pricing/reference/import-csv', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
}

export async function uploadInflationCsv(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post('/admin/pricing/inflation/upload-csv', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
}

export async function fetchInflationAdjustments(params: { limit?: number; offset?: number } = {}) {
  const { limit = 50, offset = 0 } = params;
  const query = buildQueryString({ limit, offset });
  const suffix = query ? `?${query}` : '';
  const response = await apiClient.get<InflationAdjustmentListResponse>(
    `/admin/pricing/inflation${suffix}`
  );
  const items = normalizePaginatedItems<InflationAdjustment>(response.data);
  const total = getPaginatedTotal<InflationAdjustment>(response.data);
  const meta = getPaginatedLimitOffset<InflationAdjustment>(response.data);
  return {
    items,
    total,
    limit: meta.limit ?? limit,
    offset: meta.offset ?? offset
  };
}

export async function createInflationAdjustment(payload: InflationAdjustmentCreatePayload) {
  const response = await apiClient.post<InflationAdjustment>('/admin/pricing/inflation', payload);
  return response.data;
}

export async function updateInflationAdjustment(
  id: string | number,
  payload: InflationAdjustmentUpdatePayload
) {
  const response = await apiClient.put<InflationAdjustment>(
    `/admin/pricing/inflation/${id}`,
    payload
  );
  return response.data;
}

export async function deleteInflationAdjustment(id: string | number) {
  await apiClient.delete(`/admin/pricing/inflation/${id}`);
}

export function useInflationAdjustments(params: { limit?: number; offset?: number } = {}) {
  const { limit = 50, offset = 0 } = params;
  const filters = useMemo(() => ({ limit, offset }), [limit, offset]);
  return useQuery({
    queryKey: queryKeys.admin.pricing.inflation.list(filters),
    queryFn: () => fetchInflationAdjustments(filters),
    retry: (failureCount, error: any) => {
      const status = error?.response?.status;
      if (!shouldRetry(status)) return false;
      return failureCount < 2;
    }
  });
}

export function useUploadReferenceCsv() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadReferenceCsv,
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.pricing.base() });
    },
    onError: (error) => {
      throw new Error(extractErrorMessage(error));
    }
  });
}

export function useUploadInflationCsv() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadInflationCsv,
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.pricing.inflation.listBase() });
    },
    onError: (error) => {
      throw new Error(extractErrorMessage(error));
    }
  });
}

export function useCreateInflationAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createInflationAdjustment,
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.pricing.inflation.listBase() });
    },
    onError: (error) => {
      throw new Error(extractErrorMessage(error));
    }
  });
}

export function useUpdateInflationAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: InflationAdjustmentUpdatePayload }) =>
      updateInflationAdjustment(id, payload),
    retry: false,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.pricing.inflation.listBase() });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.pricing.inflation.byId(variables.id) });
    },
    onError: (error) => {
      throw new Error(extractErrorMessage(error));
    }
  });
}

export function useDeleteInflationAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => deleteInflationAdjustment(id),
    retry: false,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.pricing.inflation.listBase() });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.pricing.inflation.byId(id) });
    },
    onError: (error) => {
      throw new Error(extractErrorMessage(error));
    }
  });
}
