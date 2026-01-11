'use client';

import { useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { Card, CardContent, CardTitle } from '@/components/ui/Card';
import { RequireScope } from '@/components/system/RequireScope';
import { formatDateTime } from '@/lib/format';
import { opsSpendEnabled } from '@/lib/featureFlags';
import { useAdminSpendAllowed } from '@/lib/queries/admin';
import { getPaginatedLimitOffset } from '@/lib/queries/queryUtils';
import type { AllowedUsageRead } from '@/types/api';
import { OpsErrorState } from '@/components/admin/OpsErrorState';
import { OpsPagination } from '@/components/admin/OpsPagination';

const DEFAULT_LIMIT = 20;

function SpendAllowlistContent() {
  const [offset, setOffset] = useState(0);
  const [limit] = useState(DEFAULT_LIMIT);

  const spendEnabled = opsSpendEnabled();

  const spendQuery = useAdminSpendAllowed(
    { limit, offset },
    { enabled: spendEnabled }
  );

  const { limit: responseLimit, offset: responseOffset } =
    getPaginatedLimitOffset<AllowedUsageRead>(spendQuery.data);
  const pageSize = responseLimit && responseLimit > 0 ? responseLimit : limit;
  const currentOffset = responseOffset ?? offset;

  const items = useMemo(() => spendQuery.data?.items ?? [], [spendQuery.data?.items]);
  const total = spendQuery.data?.total ?? items.length;

  const handlePrev = () => setOffset((prev) => Math.max(prev - pageSize, 0));
  const handleNext = () => setOffset((prev) => prev + pageSize);

  if (!spendEnabled) {
    return (
      <Card>
        <CardContent className="space-y-2">
          <CardTitle>Désactivé (feature flag)</CardTitle>
          <p className="text-sm text-slate-600">
            L&apos;affichage lecture seule des dépenses est protégé par NEXT_PUBLIC_FF_ADMIN_SPEND.
            Activez le flag pour interroger le contrat /admin/spend/allowed.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (spendQuery.isLoading) {
    return <LoadingState label="Chargement de la liste des dépenses autorisées..." />;
  }

  if (spendQuery.isError) {
    const status = isAxiosError(spendQuery.error) ? spendQuery.error.response?.status : null;
    return (
      <OpsErrorState
        error={spendQuery.error}
        statusCode={status}
        onRetry={() => spendQuery.refetch()}
        fallbackMessage="Lecture impossible de la liste des dépenses autorisées."
      />
    );
  }

  if (!items.length) {
    return (
      <EmptyState
        title="Aucune entrée"
        message="Aucune dépense autorisée n'a été trouvée."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Spend allowlist</h1>
          <p className="text-sm text-slate-500">
            Lecture seule de l&apos;endpoint GET /admin/spend/allowed (admin/support).
          </p>
        </div>
        <OpsPagination
          limit={pageSize}
          offset={currentOffset}
          total={total}
          pageItemCount={items.length}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      </div>

      <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Owner ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Merchant ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Category ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Créé le
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Mis à jour
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {items.map((entry) => (
              <tr key={entry.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm font-medium text-slate-800">{entry.id}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{entry.owner_id}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{entry.merchant_id}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{entry.category_id}</td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {entry.created_at ? formatDateTime(entry.created_at) : '—'}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {entry.updated_at ? formatDateTime(entry.updated_at) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminSpendPage() {
  return (
    <RequireScope
      anyScopes={['ADMIN', 'SUPPORT']}
      unauthorizedMessage="Accès refusé : cette page est réservée aux scopes admin/support."
      loadingLabel="Vérification de l'accès administrateur..."
    >
      <SpendAllowlistContent />
    </RequireScope>
  );
}
