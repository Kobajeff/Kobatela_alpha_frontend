'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { isAxiosError } from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { LoadingState } from '@/components/common/LoadingState';
import { extractErrorMessage } from '@/lib/apiClient';
import {
  useAdminUserApiKeys,
  useAdminUserProfile,
  useIssueAdminUserApiKey,
  useRevokeAdminUserApiKey
} from '@/lib/queries/admin';

const adminUsersPath = ['', 'admin', 'users'].join('/');

function normalizeApiKeyError(error: unknown) {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 403) return 'Access denied (admin scope required).';
    if (status === 404) return 'Utilisateur introuvable.';
    if (status === 409) return 'Conflit: cette action a déjà été effectuée.';
    if (status === 422) return extractErrorMessage(error);
  }
  return extractErrorMessage(error);
}

export default function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const {
    data: user,
    isLoading,
    isError,
    error
  } = useAdminUserProfile(id);
  const {
    data: keys,
    refetch: refetchKeys,
    isLoading: keysLoading,
    isError: isKeysError,
    error: keysError
  } = useAdminUserApiKeys(id, { active: true });
  const issueApiKey = useIssueAdminUserApiKey(id);
  const revokeApiKey = useRevokeAdminUserApiKey(id);
  const [issueName, setIssueName] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const userKeys = useMemo(() => keys ?? [], [keys]);
  const keysForbidden =
    isKeysError && isAxiosError(keysError) && keysError.response?.status === 403;
  const actionsForbidden = keysForbidden;

  const handleCopyId = async () => {
    if (!user?.id || typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(String(user.id));
      setCopyMessage('Identifiant copié.');
    } catch (_error) {
      setCopyMessage('Impossible de copier l\'identifiant.');
    }
    setTimeout(() => setCopyMessage(null), 2000);
  };

  const handleIssueKey = async () => {
    setActionError(null);
    try {
      await issueApiKey.mutateAsync({ name: issueName.trim() || undefined });
      setIssueName('');
      refetchKeys();
    } catch (err) {
      setActionError(normalizeApiKeyError(err));
    }
  };

  const handleRevokeKey = async (apiKeyId: string) => {
    if (!window.confirm('Révoquer cette clé API ?')) {
      return;
    }
    setActionError(null);
    try {
      await revokeApiKey.mutateAsync({ apiKeyId });
      refetchKeys();
    } catch (err) {
      setActionError(normalizeApiKeyError(err));
    }
  };

  if (isLoading) {
    return <LoadingState label="Chargement du profil utilisateur..." />;
  }

  if (isError || !user) {
    return <ErrorAlert message={extractErrorMessage(error)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Profil utilisateur</h1>
          <p className="text-sm text-muted-foreground">Détails du compte et gestion des clés API.</p>
        </div>
        <Link
          href={adminUsersPath as Route}
          className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
        >
          ← Retour aux utilisateurs
        </Link>
      </div>

      {copyMessage && (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          {copyMessage}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Identité</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">User ID</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs">{user.id}</span>
              <button
                type="button"
                className="rounded-md border px-2 py-0.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                onClick={handleCopyId}
              >
                Copier
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{user.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Rôle</span>
            <span className="font-medium capitalize">{user.role}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Statut</span>
            <span className="font-medium">{user.is_active ? 'Actif' : 'Inactif'}</span>
          </div>
          {user.created_at && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Compte créé</span>
              <span className="font-medium">{new Date(user.created_at).toLocaleString()}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Clés API</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {actionError && <ErrorAlert message={actionError} />}
          {keysLoading && <p className="text-muted-foreground">Chargement des clés API...</p>}
          {keysForbidden && (
            <ErrorAlert message="Access denied (admin scope required) pour les clés API." />
          )}
          {isKeysError && !keysForbidden && (
            <ErrorAlert message={extractErrorMessage(keysError)} />
          )}

          {!actionsForbidden && (
            <div className="flex flex-col gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
              <label className="text-xs font-semibold text-slate-700">
                Nom de la clé (optionnel)
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  className="w-64 rounded-md border px-3 py-2 text-sm"
                  placeholder="Clé interne"
                  value={issueName}
                  onChange={(event) => setIssueName(event.target.value)}
                  disabled={issueApiKey.isPending || revokeApiKey.isPending}
                />
                <button
                  type="button"
                  className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  onClick={handleIssueKey}
                  disabled={issueApiKey.isPending || revokeApiKey.isPending}
                >
                  {issueApiKey.isPending ? 'Création...' : 'Émettre une clé'}
                </button>
              </div>
            </div>
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
                      onClick={() => handleRevokeKey(key.id)}
                      className="rounded-md border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                      disabled={revokeApiKey.isPending || issueApiKey.isPending}
                    >
                      {revokeApiKey.isPending ? 'Blocage...' : 'Révoquer'}
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
