'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { LoadingState } from '@/components/common/LoadingState';
import { formatDateTime } from '@/lib/format';
import { extractErrorMessage } from '@/lib/apiClient';
import { normalizeApiError } from '@/lib/apiError';
import {
  useDeleteInflationAdjustment,
  useInflationAdjustments,
  useUpdateInflationAdjustment
} from '@/lib/queries/pricingAdmin';
import { useAuthMe } from '@/lib/queries/sender';
import { userHasScope } from '@/lib/scopes';
import type { InflationAdjustmentUI } from '@/types/ui';
import type { AuthUser } from '@/types/auth';

export default function AdminPricingInflationDetailPage({
  params
}: {
  params: { id: string };
}) {
  const { id } = params;
  const router = useRouter();
  const { data: user } = useAuthMe();
  const authUser = user as AuthUser | undefined;
  const hasPricingScope = userHasScope(authUser, 'pricing_admin');
  const query = useInflationAdjustments({ limit: 200, offset: 0 });
  const updateMutation = useUpdateInflationAdjustment();
  const deleteMutation = useDeleteInflationAdjustment();
  const [payload, setPayload] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const item = useMemo<InflationAdjustmentUI | undefined>(() => {
    if (!query.data?.items) return undefined;
    return query.data.items.find((entry) => entry.id === id);
  }, [id, query.data?.items]);

  useEffect(() => {
    if (item) {
      const nextPayload =
        item.payload && Object.keys(item.payload).length > 0
          ? item.payload
          : { name: item.name, label: item.label, active: item.active };
      setPayload(JSON.stringify(nextPayload ?? {}, null, 2));
    }
  }, [item]);

  const handleRefresh = () => query.refetch();

  const handleUpdate = async () => {
    if (!item || !hasPricingScope) return;
    setFormError(null);
    setFormSuccess(null);
    let parsed: Record<string, unknown>;
    try {
      parsed = payload ? JSON.parse(payload) : {};
    } catch (error) {
      setFormError('Payload JSON invalide.');
      return;
    }
    try {
      await updateMutation.mutateAsync({ id: item.id, payload: parsed });
      setFormSuccess('Ajustement mis à jour.');
      await query.refetch();
    } catch (error) {
      const normalized = normalizeApiError(error);
      const message =
        normalized.status === 403
          ? 'Accès refusé : scope pricing_admin requis.'
          : normalized.status === 422 || normalized.status === 409
          ? normalized.message
          : extractErrorMessage(error);
      setFormError(message);
    }
  };

  const handleDelete = async () => {
    if (!item || !hasPricingScope) return;
    const confirmed =
      typeof window !== 'undefined'
        ? window.confirm('Supprimer cet ajustement ?')
        : true;
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync(item.id);
      router.replace('/admin/pricing/inflation' as Route);
      await query.refetch();
    } catch (error) {
      const normalized = normalizeApiError(error);
      const message =
        normalized.status === 403
          ? 'Accès refusé : scope pricing_admin requis.'
          : normalized.status === 422 || normalized.status === 409
          ? normalized.message
          : extractErrorMessage(error);
      setFormError(message);
    }
  };

  if (query.isLoading) {
    return <LoadingState label="Chargement de l'ajustement..." />;
  }

  if (query.isError) {
    const normalized = normalizeApiError(query.error);
    const message =
      normalized.status === 403
        ? 'Accès refusé : scope pricing_admin requis.'
        : extractErrorMessage(query.error);
    return (
      <div className="p-4">
        <ErrorAlert message={message} />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="space-y-3 p-4">
        <ErrorAlert message="Ajustement introuvable. Essayez de rafraîchir la liste." />
        <Button variant="outline" onClick={handleRefresh} disabled={query.isFetching}>
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {!hasPricingScope && (
        <ErrorAlert message="Access denied (pricing_admin required). Vous restez connecté." />
      )}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Inflation adjustment #{item.id}</h1>
          <p className="text-sm text-slate-600">
            PUT /admin/pricing/inflation/{'{id}'} | DELETE /admin/pricing/inflation/{'{id}'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={query.isFetching}>
            Refresh list
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/admin/pricing/inflation' as Route)}
          >
            Retour à la liste
          </Button>
        </div>
      </div>

      <Card className="space-y-3 p-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase text-slate-500">Nom</p>
            <p className="text-sm text-slate-800">
              {typeof item.name === 'string'
                ? item.name
                : typeof item.label === 'string'
                  ? item.label
                  : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Actif</p>
            <p className="text-sm text-slate-800">
              {item.active === undefined ? '—' : item.active ? 'Oui' : 'Non'}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Créé le</p>
            <p className="text-sm text-slate-800">
              {typeof item.created_at === 'string' ? formatDateTime(item.created_at) : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Mis à jour</p>
            <p className="text-sm text-slate-800">
              {typeof item.updated_at === 'string' ? formatDateTime(item.updated_at) : '—'}
            </p>
          </div>
        </div>
      </Card>

      <Card className="space-y-4 p-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Éditer le payload JSON</h2>
          <p className="text-sm text-slate-600">
            Modifiez les champs puis validez pour envoyer un PUT. Utilisez le bouton Supprimer pour
            supprimer définitivement cet ajustement.
          </p>
        </div>
        <textarea
          value={payload}
          onChange={(event) => setPayload(event.target.value)}
          className="h-64 w-full rounded-md border border-slate-300 p-3 font-mono text-sm"
          spellCheck={false}
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Button
              onClick={handleUpdate}
              disabled={updateMutation.isPending || !hasPricingScope}
            >
              {updateMutation.isPending ? 'Mise à jour...' : 'Mettre à jour'}
            </Button>
            <Button
              variant="outline"
              onClick={handleDelete}
              disabled={deleteMutation.isPending || !hasPricingScope}
            >
              {deleteMutation.isPending ? 'Suppression...' : 'Supprimer'}
            </Button>
          </div>
          <span className="text-xs text-slate-500">
            Aucune relance automatique pour 401/403/409/422.
          </span>
        </div>
        {formSuccess && (
          <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            {formSuccess}
          </div>
        )}
        {formError && <ErrorAlert message={formError} />}
      </Card>
    </div>
  );
}
