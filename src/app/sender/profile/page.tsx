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

  const createdAt = data.created_at ? new Date(data.created_at).toLocaleDateString() : 'N/A';
  const activationLabel = data.is_active === undefined ? 'N/A' : data.is_active ? 'Actif' : 'Inactif';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Mon profil</h1>
        <p className="text-sm text-slate-600">Gérez vos informations de compte.</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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
          <div>
            <dt className="text-sm font-medium text-slate-600">Canal de paiement</dt>
            <dd className="text-base font-semibold text-slate-900">{data.payout_channel ?? 'N/A'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-600">Date de création</dt>
            <dd className="text-base font-semibold text-slate-900">{createdAt}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-600">Statut</dt>
            <dd className="text-base font-semibold text-slate-900">{activationLabel}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
