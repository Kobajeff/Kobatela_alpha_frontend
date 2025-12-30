'use client';

import { extractErrorMessage } from '@/lib/apiClient';
import { useAuthMe } from '@/lib/queries/sender';

export default function SenderProfilePage() {
  const { data, isLoading, error } = useAuthMe();

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          Chargement de votre profil...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {extractErrorMessage(error)}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const scopeLabel =
    data.scopeList && data.scopeList.length > 0 ? data.scopeList.join(', ') : 'Non disponible (MVP)';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Mon profil</h1>
        <p className="text-sm text-slate-600">Gérez vos informations de compte.</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-slate-600">Identifiant</dt>
            <dd className="text-base font-semibold text-slate-900">
              {data.userId ?? data.id ?? 'Non disponible (MVP)'}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-600">Email</dt>
            <dd className="text-base font-semibold text-slate-900">{data.email ?? 'N/A'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-600">Nom d'utilisateur</dt>
            <dd className="text-base font-semibold text-slate-900">{data.username ?? 'N/A'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-600">Rôle</dt>
            <dd className="text-base font-semibold capitalize text-slate-900">{data.role}</dd>
          </div>
          {data.payout_channel ? (
            <div>
              <dt className="text-sm font-medium text-slate-600">Canal de paiement</dt>
              <dd className="text-base font-semibold text-slate-900">{data.payout_channel}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-sm font-medium text-slate-600">Scopes</dt>
            <dd className="text-base font-semibold text-slate-900">{scopeLabel}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
        <p className="font-medium text-slate-800">Informations non disponibles (MVP)</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Date de création du compte</li>
          <li>Statut d&apos;activation</li>
          <li>Adresse et informations personnelles avancées</li>
        </ul>
      </div>
    </div>
  );
}
