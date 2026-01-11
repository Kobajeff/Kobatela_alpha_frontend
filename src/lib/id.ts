'use client';

import type { IdInput, UIId } from '@/types/id';

export function toUIId(id: IdInput): UIId {
  return String(id);
}

export function assertUIId(id: unknown): UIId {
  if (typeof id === 'string') return id;
  if (typeof id === 'number') return String(id);
  throw new Error('Invalid id value');
}

export function normalizeIdField<T extends { id: IdInput }>(
  obj: T
): Omit<T, 'id'> & { id: UIId } {
  return {
    ...obj,
    id: toUIId(obj.id)
  };
}

export function normalizeOptionalId(id?: IdInput | null): UIId | null | undefined {
  if (id === null) return null;
  if (id === undefined) return undefined;
  return toUIId(id);
}
