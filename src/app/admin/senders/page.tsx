'use client';

import { useState } from 'react';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { LoadingState } from '@/components/common/LoadingState';
import { extractErrorMessage } from '@/lib/apiClient';
import { useAdminSenders } from '@/lib/queries/admin';

export default function AdminSendersPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading, isError, error, refetch } = useAdminSenders({
    limit: 50,
    offset: 0,
    q: search || undefined
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Senders</h1>
          <p className="text-sm text-muted-foreground">Gérez les comptes expéditeurs et hybrides.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            className="w-64 rounded-md border px-3 py-2 text-sm"
            placeholder="Rechercher par email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            onClick={() => refetch()}
          >
            Rechercher
          </button>
        </div>
      </div>

      {isLoading && <LoadingState label="Chargement des expéditeurs..." />}

      {isError && <ErrorAlert message={extractErrorMessage(error)} />}

      {!isLoading && !isError && items.length === 0 && (
        <p className="text-sm text-slate-600">Aucun expéditeur trouvé.</p>
      )}

      {!isLoading && !isError && items.length > 0 && (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Email</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Rôle</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Créé le</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {items.map((sender) => (
                <tr key={sender.id}>
                  <td className="px-4 py-2">{sender.email}</td>
                  <td className="px-4 py-2 capitalize">{sender.role}</td>
                  <td className="px-4 py-2">
                    {new Date(sender.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    {sender.is_active ? (
                      <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                        Actif
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        Inactif
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
