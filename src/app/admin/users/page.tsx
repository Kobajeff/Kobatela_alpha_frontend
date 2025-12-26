'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Route } from 'next';
import { isAxiosError } from 'axios';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { LoadingState } from '@/components/common/LoadingState';
import { extractErrorMessage } from '@/lib/apiClient';
import { useAdminUsers } from '@/lib/queries/admin';
import { getPaginatedLimitOffset, getPaginatedTotal, normalizePaginatedItems } from '@/lib/queries/queryUtils';
import type { User } from '@/types/api';

const adminUserDetailBase = ['', 'admin', 'users'].join('/');
const adminSendersPath = ['', 'admin', 'senders'].join('/');

function formatRole(role: unknown) {
  if (Array.isArray(role)) {
    return role.map((value) => String(value)).filter(Boolean).join(' / ');
  }
  if (typeof role === 'string') {
    const parts = role.split(/[\\s,|/]+/).map((value) => value.trim()).filter(Boolean);
    return parts.length > 0 ? parts.join(' / ') : role;
  }
  return '';
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const limit = 50;

  const query = useAdminUsers({ limit, offset, q: search || undefined });
  const items = useMemo<User[]>(() => normalizePaginatedItems<User>(query.data), [query.data]);
  const total = getPaginatedTotal<User>(query.data);
  const { limit: responseLimit, offset: responseOffset } = getPaginatedLimitOffset<User>(query.data);
  const resolvedLimit = responseLimit ?? limit;
  const resolvedOffset = responseOffset ?? offset;
  const isPaginated =
    !Array.isArray(query.data) &&
    typeof (query.data as { total?: number })?.total === 'number';

  const isForbidden =
    query.isError && isAxiosError(query.error) && query.error.response?.status === 403;

  const canPrev = resolvedOffset > 0;
  const canNext = resolvedOffset + items.length < total;

  const handleRowClick = (id: string) => {
    router.push(`${adminUserDetailBase}/${id}` as Route);
  };

  const handleCopy = async (value: string, event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      setCopyMessage('Copie non disponible.');
      setTimeout(() => setCopyMessage(null), 2000);
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      setCopyMessage(`ID ${value} copié.`);
    } catch (_error) {
      setCopyMessage('Impossible de copier l\'ID.');
    }
    setTimeout(() => setCopyMessage(null), 2000);
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Users</h1>
          <p className="text-sm text-muted-foreground">
            Répertoire global des utilisateurs (IDs visibles pour les mandats et API keys).
          </p>
          <Link
            href={adminSendersPath as Route}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Voir uniquement les expéditeurs →
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            className="w-64 rounded-md border px-3 py-2 text-sm"
            placeholder="Rechercher par email..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setOffset(0);
            }}
          />
          <button
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
          >
            {query.isFetching ? 'Recherche...' : 'Rechercher'}
          </button>
        </div>
      </div>

      {copyMessage && (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          {copyMessage}
        </div>
      )}

      {query.isLoading && <LoadingState label="Chargement des utilisateurs..." />}

      {isForbidden && (
        <ErrorAlert message="Access denied (admin scope required)" />
      )}

      {query.isError && !isForbidden && (
        <ErrorAlert message={extractErrorMessage(query.error)} />
      )}

      {!query.isLoading && !query.isError && items.length === 0 && (
        <p className="text-sm text-slate-600">Aucun utilisateur trouvé.</p>
      )}

      {!query.isLoading && !query.isError && items.length > 0 && (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-700">User ID</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Email</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Rôle</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Créé le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {items.map((user) => {
                const roleLabel = formatRole(user.role) || '—';
                return (
                  <tr
                    key={user.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => handleRowClick(String(user.id))}
                  >
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-900">{user.id}</span>
                        <button
                          type="button"
                          className="rounded-md border px-2 py-0.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                          onClick={(event) => handleCopy(String(user.id), event)}
                        >
                          Copier
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-2">{user.email}</td>
                    <td className="px-4 py-2 capitalize">{roleLabel}</td>
                    <td className="px-4 py-2">
                      {user.created_at ? new Date(user.created_at).toLocaleString() : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {isPaginated && !query.isLoading && !query.isError && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
          <span>
            {items.length === 0
              ? '0 résultat'
              : `Affichage ${resolvedOffset + 1}-${resolvedOffset + items.length} sur ${total}`}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-md border px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              onClick={() => setOffset(Math.max(0, resolvedOffset - resolvedLimit))}
              disabled={!canPrev || query.isFetching}
            >
              Précédent
            </button>
            <button
              type="button"
              className="rounded-md border px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              onClick={() => setOffset(resolvedOffset + resolvedLimit)}
              disabled={!canNext || query.isFetching}
            >
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
