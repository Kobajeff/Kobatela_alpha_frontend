'use client';

import { useMemo } from 'react';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { LoadingState } from '@/components/common/LoadingState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { extractErrorMessage } from '@/lib/apiClient';
import { useAdminBlockSender, useAdminSenderProfile, useAdminSendersList } from '@/lib/queries/admin';
import { useToast } from '@/components/ui/ToastProvider';
import Link from 'next/link';

export default function AdminSenderProfilePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const {
    data: sender,
    isLoading,
    isError,
    error
  } = useAdminSenderProfile(id);
  const {
    data: keys,
    refetch,
    isLoading: keysLoading,
    isError: isKeysError,
    error: keysError
  } = useAdminSendersList({ limit: 200, offset: 0 });
  const blockSender = useAdminBlockSender();
  const { showToast } = useToast();

  const userKeys = useMemo(
    () => (keys ?? []).filter((row) => String(row.user_id) === String(id)),
    [keys, id]
  );

  const handleBlock = (apiKeyId: string) => {
    if (!window.confirm("Bloquer cette clé API ? L'expéditeur ne pourra plus l'utiliser.")) {
      return;
    }
    blockSender.mutate(
      { apiKeyId },
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
    return <LoadingState label="Chargement du profil expéditeur..." />;
  }

  if (isError || !sender) {
    return <ErrorAlert message={extractErrorMessage(error)} />;
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Profil expéditeur</h1>
            <p className="text-sm text-muted-foreground">Détails du compte et clés API associées.</p>
          </div>
          <Link
            href="/admin/senders"
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
          >
            ← Retour aux expéditeurs
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Identité</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{sender.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Nom d'utilisateur</span>
            <span className="font-medium">{sender.username}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Rôle</span>
            <span className="font-medium">{sender.role}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Statut</span>
            <span className="font-medium">{sender.is_active ? 'Actif' : 'Inactif'}</span>
          </div>
          {sender.payout_channel && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Canal de paiement</span>
              <span className="font-medium">{sender.payout_channel}</span>
            </div>
          )}
          {sender.created_at && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Compte créé</span>
              <span className="font-medium">{new Date(sender.created_at).toLocaleString()}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Clés API actives</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {keysLoading && <p className="text-muted-foreground">Chargement des clés API...</p>}
          {isKeysError && <ErrorAlert message={extractErrorMessage(keysError)} />}
          {userKeys.length === 0 && !keysLoading && !isKeysError && (
            <p className="text-muted-foreground">Aucune clé API active trouvée.</p>
          )}
          {userKeys.map((key) => (
            <div
              key={key.api_key_id}
              className="flex flex-col gap-2 rounded-md border border-slate-100 px-3 py-2 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-semibold text-slate-800">{key.api_key_name ?? 'Clé API'}</p>
                <p className="text-xs text-slate-500">ID : {key.api_key_id}</p>
                {key.created_at && (
                  <p className="text-xs text-slate-500">Créée le {new Date(key.created_at).toLocaleString()}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">Active</span>
                <button
                  type="button"
                  onClick={() => handleBlock(key.api_key_id)}
                  className="rounded-md border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                  disabled={blockSender.isPending}
                >
                  {blockSender.isPending ? 'Blocage...' : 'Bloquer'}
                </button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
