'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { LoadingState } from '@/components/common/LoadingState';
import { useAdminBlockSender, useAdminSendersList } from '@/lib/queries/admin';
import { extractErrorMessage } from '@/lib/apiClient';
import { useToast } from '@/components/ui/ToastProvider';

export default function AdminSendersPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading, isError, error, refetch } = useAdminSendersList({ limit: 100, offset: 0 });
  const blockSender = useAdminBlockSender();
  const { showToast } = useToast();

  const rows = useMemo(() => {
    if (!data) return [];
    const term = search.trim().toLowerCase();
    if (!term) return data;
    return data.filter(
      (row) =>
        row.email.toLowerCase().includes(term) ||
        (row.username && row.username.toLowerCase().includes(term))
    );
  }, [data, search]);

  const handleBlock = (api_key_id: string | number) => {
    if (!window.confirm("Bloquer cette clé API ? L'expéditeur ne pourra plus l'utiliser.")) {
      return;
    }
    blockSender.mutate(
      { api_key_id },
      {
        onSuccess: () => {
          showToast?.('Clé API bloquée avec succès', 'success');
          refetch();
        },
        onError: (err) => {
          showToast?.(extractErrorMessage(err), 'error');
        }
      }
    );
  };

  if (isLoading) {
    return <LoadingState label="Chargement des expéditeurs..." />;
  }

  if (isError) {
    return <ErrorAlert message={extractErrorMessage(error)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Senders</h1>
          <p className="text-sm text-muted-foreground">Gérez les expéditeurs actifs et leurs clés API.</p>
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par email ou nom d'utilisateur"
          className="w-72 rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
      </div>

      <div className="overflow-hidden rounded-md border bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Username</th>
              <th className="px-4 py-2">Rôle</th>
              <th className="px-4 py-2">Clé API</th>
              <th className="px-4 py-2">Statut</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && (
              <tr>
                <td className="px-4 py-4 text-center text-sm text-slate-500" colSpan={6}>
                  Aucun expéditeur trouvé.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={`${row.user_id}-${row.api_key_id}`} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{row.email}</td>
                <td className="px-4 py-3 text-slate-600">{row.username ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600">{row.role}</td>
                <td className="px-4 py-3 text-slate-600">
                  <div className="flex flex-col">
                    <span className="font-medium">{row.api_key_name ?? 'Clé API'}</span>
                    <span className="text-xs text-slate-500">ID: {row.api_key_id}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {row.is_active ? (
                    <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">Active</span>
                  ) : (
                    <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">Bloquée</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/admin/senders/${row.user_id}`}
                      className="rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Voir le profil
                    </Link>
                    {row.is_active && (
                      <button
                        type="button"
                        onClick={() => handleBlock(row.api_key_id)}
                        className="rounded-md border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                        disabled={blockSender.isPending}
                      >
                        {blockSender.isPending ? 'Blocage...' : 'Bloquer'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
