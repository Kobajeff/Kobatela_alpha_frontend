'use client';

import { useMemo, useState } from 'react';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { LoadingState } from '@/components/common/LoadingState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { extractErrorMessage } from '@/lib/apiClient';
import { useAdminSenderProfile, useAdminUserApiKeys, useRevokeAdminUserApiKey } from '@/lib/queries/admin';
import { useToast } from '@/components/ui/ToastProvider';
import Link from 'next/link';
import type { Route } from 'next';
import { isAxiosError } from 'axios';

const adminSendersPath = ['', 'admin', 'senders'].join('/');

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
  } = useAdminUserApiKeys(id, { active: true });
  const revokeApiKey = useRevokeAdminUserApiKey(id);
  const { showToast } = useToast();
  const [keyActionsDenied, setKeyActionsDenied] = useState(false);

  const userKeys = useMemo(() => keys ?? [], [keys]);
  const keysForbidden =
    isKeysError && isAxiosError(keysError) && keysError.response?.status === 403;
  const actionsForbidden = keysForbidden || keyActionsDenied;

  const handleBlock = (apiKeyId: string) => {
    if (!window.confirm("Bloquer cette clé API ? L'expéditeur ne pourra plus l'utiliser.")) {
      return;
    }
    revokeApiKey.mutate(
      { apiKeyId },
      {
        onSuccess: () => {
          showToast?.('Clé API bloquée avec succès', 'success');
          refetch();
        },
        onError: (err) => {
          if (isAxiosError(err) && err.response?.status === 403) {
            setKeyActionsDenied(true);
            showToast?.("Insufficient scope: action non autorisée sur les clés API.", 'error');
            return;
          }
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
            href={adminSendersPath as Route}
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
          {keysForbidden && (
            <ErrorAlert message="Insufficient scope: accès aux clés API non autorisé." />
          )}
          {isKeysError && !keysForbidden && (
            <ErrorAlert message={extractErrorMessage(keysError)} />
          )}
          {userKeys.length === 0 && !keysLoading && !isKeysError && !keysForbidden && (
            <p className="text-muted-foreground">Aucune clé API active trouvée.</p>
          )}
          {!keysForbidden &&
            userKeys.map((key) => (
              <div
                key={key.id}
                className="flex flex-col gap-2 rounded-md border border-slate-100 px-3 py-2 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-semibold text-slate-800">{key.name ?? 'Clé API'}</p>
                  <p className="text-xs text-slate-500">ID : {key.id}</p>
                  {key.created_at && (
                    <p className="text-xs text-slate-500">
                      Créée le {new Date(key.created_at).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">
                    Active
                  </span>
                  {!actionsForbidden && (
                    <button
                      type="button"
                      onClick={() => handleBlock(key.id)}
                      className="rounded-md border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                      disabled={revokeApiKey.isPending}
                    >
                      {revokeApiKey.isPending ? 'Blocage...' : 'Bloquer'}
                    </button>
                  )}
                </div>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
