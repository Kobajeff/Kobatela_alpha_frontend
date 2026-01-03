'use client';

import { useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { Card, CardContent, CardTitle } from '@/components/ui/Card';
import { formatDateTime } from '@/lib/format';
import { opsAlertsEnabled } from '@/lib/featureFlags';
import { useAdminAlerts } from '@/lib/queries/admin';
import { getPaginatedLimitOffset } from '@/lib/queries/queryUtils';
import { OpsErrorState } from '@/components/admin/OpsErrorState';
import { OpsPagination } from '@/components/admin/OpsPagination';
import type { AlertRead } from '@/types/api';

const DEFAULT_LIMIT = 20;

function getPayloadSummary(payload?: AlertRead['payload']) {
  if (!payload || typeof payload !== 'object') {
    return '—';
  }
  const keys = Object.keys(payload);
  return keys.length ? keys.join(', ') : '—';
}

export default function AdminAlertsPage() {
  const [offset, setOffset] = useState(0);
  const [limit] = useState(DEFAULT_LIMIT);
  const alertsEnabled = opsAlertsEnabled();

  const alertsQuery = useAdminAlerts(
    {
      limit,
      offset
    },
    { enabled: alertsEnabled }
  );

  const { limit: responseLimit, offset: responseOffset } = getPaginatedLimitOffset<AlertRead>(
    alertsQuery.data
  );
  const pageSize = responseLimit && responseLimit > 0 ? responseLimit : limit;
  const currentOffset = responseOffset ?? offset;

  const items = useMemo(() => alertsQuery.data?.items ?? [], [alertsQuery.data?.items]);
  const total = alertsQuery.data?.total ?? items.length;

  const handlePrev = () => {
    setOffset((prev) => Math.max(prev - pageSize, 0));
  };

  const handleNext = () => {
    setOffset((prev) => prev + pageSize);
  };

  if (!alertsEnabled) {
    return (
      <Card>
        <CardContent className="space-y-2">
          <CardTitle>Alerts disabled (feature flag off)</CardTitle>
          <p className="text-sm text-slate-600">
            The admin alerts view is behind a feature flag. Enable NEXT_PUBLIC_FF_ADMIN_ALERTS to
            access this read-only feed.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (alertsQuery.isLoading) {
    return <LoadingState label="Chargement des alertes..." />;
  }

  if (alertsQuery.isError) {
    const status = isAxiosError(alertsQuery.error) ? alertsQuery.error.response?.status : null;
    return (
      <OpsErrorState
        error={alertsQuery.error}
        statusCode={status}
        onRetry={() => alertsQuery.refetch()}
      />
    );
  }

  if (!items.length) {
    return <EmptyState title="Aucune alerte" message="Aucune alerte disponible pour le moment." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Alerts</h1>
          <p className="text-sm text-slate-500">
            Feed en lecture seule pour les scopes admin et support.
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
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Message
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Payload (clés)
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Créée le
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Mise à jour
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {items.map((alert) => (
              <tr key={String(alert.id)} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm font-medium text-slate-800">{alert.type}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{alert.message}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{getPayloadSummary(alert.payload)}</td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {alert.created_at ? formatDateTime(alert.created_at) : '—'}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {alert.updated_at ? formatDateTime(alert.updated_at) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
