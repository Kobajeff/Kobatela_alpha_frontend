'use client';

import { useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { LoadingState } from '@/components/common/LoadingState';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardTitle } from '@/components/ui/Card';
import { formatDateTime } from '@/lib/format';
import { isAdminAlertsEnabled } from '@/lib/featureFlags';
import { useAdminAlerts } from '@/lib/queries/admin';
import { getPaginatedLimitOffset } from '@/lib/queries/queryUtils';
import { extractErrorMessage } from '@/lib/apiClient';
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
  const alertsEnabled = isAdminAlertsEnabled();

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

  const canGoPrev = currentOffset > 0;
  const canGoNext = currentOffset + pageSize < total;

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
    const status = isAxiosError(alertsQuery.error)
      ? alertsQuery.error.response?.status
      : null;
    const message =
      status === 401 || status === 403
        ? "Accès refusé : les scopes admin ou support sont requis pour consulter les alertes."
        : extractErrorMessage(alertsQuery.error);
    return (
      <div className="p-4">
        <ErrorAlert message={message} />
      </div>
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
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span>
            Affichage {currentOffset + 1}-
            {Math.min(currentOffset + pageSize, total)} sur {total}
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={handlePrev} disabled={!canGoPrev}>
              Précédent
            </Button>
            <Button variant="secondary" size="sm" onClick={handleNext} disabled={!canGoNext}>
              Suivant
            </Button>
          </div>
        </div>
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
