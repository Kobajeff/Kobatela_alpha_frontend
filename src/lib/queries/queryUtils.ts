import type { PaginatedResponse } from '@/types/api';

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

export function buildQueryString(params: QueryParams): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    searchParams.set(key, String(value));
  });
  return searchParams.toString();
}

export function createQueryKey<T extends QueryParams | undefined>(base: string, params?: T) {
  return params ? [base, params] as const : [base] as const;
}

export function normalizePaginatedItems<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data;
  const items = (data as PaginatedResponse<T>)?.items;
  return Array.isArray(items) ? items : [];
}

export function getPaginatedTotal<T>(data: unknown): number {
  const total = (data as PaginatedResponse<T>)?.total;
  if (typeof total === 'number') return total;
  return normalizePaginatedItems<T>(data).length;
}

export function getPaginatedLimitOffset<T>(
  data: unknown
): { limit?: number; offset?: number } {
  const response = data as PaginatedResponse<T>;
  const limit = typeof response?.limit === 'number' ? response.limit : undefined;
  const offset = typeof response?.offset === 'number' ? response.offset : undefined;
  return { limit, offset };
}
