'use client';

import { useMemo, useState } from 'react';
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
  useCreateInflationAdjustment,
  useInflationAdjustments
} from '@/lib/queries/pricingAdmin';
import { useAuthMe } from '@/lib/queries/sender';
import { userHasScope } from '@/lib/scopes';
import type { InflationAdjustmentUI } from '@/types/ui';
import type { AuthUser } from '@/types/auth';
import type { UIId } from '@/types/id';

export default function AdminPricingInflationPage() {
  const router = useRouter();
  const { data: user } = useAuthMe();
  const authUser = user as AuthUser | undefined;
  const hasPricingScope = userHasScope(authUser, 'pricing_admin');
  const query = useInflationAdjustments({ limit: 100, offset: 0 });
  const createMutation = useCreateInflationAdjustment();
  const [payload, setPayload] = useState('{\n  \n}');
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const items = useMemo<InflationAdjustmentUI[]>(() => query.data?.items ?? [], [query.data?.items]);

  const handleRowClick = (id: UIId) => {
    router.push(`/admin/pricing/inflation/${id}` as Route);
  };

  const handleCreate = async () => {
    if (!hasPricingScope) return;
    setCreateError(null);
    setCreateSuccess(null);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(payload);
    } catch (error) {
      setCreateError('Payload JSON invalide.');
      return;
    }
    try {
      await createMutation.mutateAsync(parsed);
      setCreateSuccess('Inflation adjustment créée.');
      setPayload('{\n  \n}');
      await query.refetch();
    } catch (error) {
      const normalized = normalizeApiError(error);
      const message =
        normalized.status === 403
          ? 'Accès refusé : scope pricing_admin requis.'
          : normalized.status === 422 || normalized.status === 409
          ? normalized.message
          : extractErrorMessage(error);
      setCreateError(message);
    }
  };

  const renderTable = () => {
    if (query.isLoading) {
      return <LoadingState label="Chargement des ajustements inflation..." />;
    }
    if (query.isError) {
      const normalized = normalizeApiError(query.error);
      const message =
        normalized.status === 403
          ? 'Accès refusé : scope pricing_admin requis.'
          : extractErrorMessage(query.error);
      return <ErrorAlert message={message} />;
    }
    if (!items.length) {
      return <div className="text-sm text-slate-600">Aucun ajustement trouvé.</div>;
    }
    return (
      <div className="overflow-hidden rounded-md border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">ID</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Nom / Label</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Actif</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Créé le</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {items.map((item) => {
              const name =
                typeof item.name === 'string'
                  ? item.name
                  : typeof item.label === 'string'
                    ? item.label
                    : '—';
              const active = item.active === undefined ? '—' : item.active ? 'Oui' : 'Non';
              const created =
                typeof item.created_at === 'string' ? formatDateTime(item.created_at) : '—';
              return (
                <tr
                  key={item.id}
                  className="cursor-pointer hover:bg-indigo-50"
                  onClick={() => handleRowClick(item.id)}
                >
                  <td className="px-4 py-3 text-sm text-slate-800">{item.id}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{name}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{active}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{created}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Inflation adjustments</h1>
          <p className="text-sm text-slate-600">
            GET /admin/pricing/inflation | POST /admin/pricing/inflation (scope: pricing_admin)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>
            Refresh
          </Button>
          {!hasPricingScope && (
            <span className="text-xs text-amber-700">Access limited (missing pricing_admin)</span>
          )}
        </div>
      </div>

      {!hasPricingScope && (
        <ErrorAlert message="Access denied (pricing_admin required). You remain logged in." />
      )}

      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Liste</h2>
          {query.data?.total !== undefined && (
            <span className="text-xs text-slate-500">Total: {query.data.total}</span>
          )}
        </div>
        {renderTable()}
      </Card>

      <Card className="space-y-4 p-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Créer un ajustement</h2>
          <p className="text-sm text-slate-600">
            Utilisez un payload JSON brut pour POST /admin/pricing/inflation. Si le schéma exact est
            inconnu, incluez seulement les champs nécessaires.
          </p>
        </div>
        <textarea
          value={payload}
          onChange={(event) => setPayload(event.target.value)}
          className="h-48 w-full rounded-md border border-slate-300 p-3 font-mono text-sm"
          placeholder='{\n  "name": "2024 inflation",\n  "active": true\n}'
          spellCheck={false}
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button
            onClick={handleCreate}
            disabled={createMutation.isPending || !hasPricingScope}
          >
            {createMutation.isPending ? 'Création...' : 'Créer'}
          </Button>
          <span className="text-xs text-slate-500">
            Retentatives automatiques désactivées pour 401/403/409/422.
          </span>
        </div>
        {createSuccess && (
          <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            {createSuccess}
          </div>
        )}
        {createError && <ErrorAlert message={createError} />}
      </Card>
    </div>
  );
}
