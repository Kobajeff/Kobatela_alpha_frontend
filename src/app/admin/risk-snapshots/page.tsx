'use client';

import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import { Card, CardContent, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/common/LoadingState';
import { EmptyState } from '@/components/common/EmptyState';
import { formatDateTime } from '@/lib/format';
import { opsRiskSnapshotsEnabled } from '@/lib/featureFlags';
import { useAdminRiskSnapshots } from '@/lib/queries/admin';
import { getPaginatedLimitOffset } from '@/lib/queries/queryUtils';
import { OpsErrorState } from '@/components/admin/OpsErrorState';
import { OpsPagination } from '@/components/admin/OpsPagination';
import type { RiskFeatureSnapshotRead, RiskSubjectType } from '@/types/api';

const DEFAULT_LIMIT = 20;
const SUBJECT_TYPES: RiskSubjectType[] = ['MANDATE', 'ESCROW', 'PROOF'];

function getFeaturesSummary(features: RiskFeatureSnapshotRead['features_json']) {
  if (!features || typeof features !== 'object') {
    return '—';
  }
  const keys = Object.keys(features);
  if (!keys.length) return '—';
  const summary = keys.join(', ');
  return summary.length > 120 ? `${summary.slice(0, 117)}...` : summary;
}

export default function AdminRiskSnapshotsPage() {
  const [offset, setOffset] = useState(0);
  const [subjectType, setSubjectType] = useState<RiskSubjectType | ''>('');
  const [subjectIdInput, setSubjectIdInput] = useState('');
  const flagEnabled = opsRiskSnapshotsEnabled();

  const parsedSubjectId = useMemo(() => {
    const trimmed = subjectIdInput.trim();
    if (!trimmed) return undefined;
    const value = Number(trimmed);
    if (!Number.isFinite(value) || value < 0) {
      return undefined;
    }
    return value;
  }, [subjectIdInput]);

  const snapshotsQuery = useAdminRiskSnapshots(
    {
      limit: DEFAULT_LIMIT,
      offset,
      subject_type: subjectType || undefined,
      subject_id: parsedSubjectId
    },
    { enabled: flagEnabled }
  );

  const { limit: responseLimit, offset: responseOffset } = getPaginatedLimitOffset<RiskFeatureSnapshotRead>(
    snapshotsQuery.data
  );
  const pageSize = responseLimit && responseLimit > 0 ? responseLimit : DEFAULT_LIMIT;
  const currentOffset = responseOffset ?? offset;

  const items = useMemo(() => snapshotsQuery.data?.items ?? [], [snapshotsQuery.data?.items]);
  const total = snapshotsQuery.data?.total ?? items.length;

  const handlePrev = () => setOffset((prev) => Math.max(prev - pageSize, 0));
  const handleNext = () => setOffset((prev) => prev + pageSize);

  const handleFiltersSubmit = (event: FormEvent) => {
    event.preventDefault();
    setOffset(0);
  };

  if (!flagEnabled) {
    return (
      <Card>
        <CardContent className="space-y-2">
          <CardTitle>Risk snapshots disabled (feature flag off)</CardTitle>
          <p className="text-sm text-slate-600">
            The risk snapshots view is gated by NEXT_PUBLIC_FF_ADMIN_RISK_SNAPSHOTS. Enable the flag
            to fetch the admin/support list from the backend.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (snapshotsQuery.isLoading) {
    return <LoadingState label="Chargement des risk snapshots..." />;
  }

  if (snapshotsQuery.isError) {
    const status = isAxiosError(snapshotsQuery.error) ? snapshotsQuery.error.response?.status : null;
    return (
      <OpsErrorState
        error={snapshotsQuery.error}
        statusCode={status}
        onRetry={() => snapshotsQuery.refetch()}
      />
    );
  }

  if (!items.length) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Risk snapshots</h1>
          <p className="text-sm text-slate-500">
            Vue en lecture seule pour exercer l’endpoint admin/support /admin/risk-snapshots.
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <Filters
            subjectType={subjectType}
            subjectIdInput={subjectIdInput}
            onSubjectTypeChange={setSubjectType}
            onSubjectIdChange={setSubjectIdInput}
            onSubmit={handleFiltersSubmit}
          />
        </div>
        <EmptyState
          title="Aucun snapshot disponible"
          message="Aucun résultat trouvé pour les filtres actuels."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Risk snapshots</h1>
          <p className="text-sm text-slate-500">
            Lecture seule, scopes admin/support. Pagination via limit/offset.
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

      <div className="rounded-md border border-slate-200 bg-white p-4">
        <Filters
          subjectType={subjectType}
          subjectIdInput={subjectIdInput}
          onSubjectTypeChange={setSubjectType}
          onSubjectIdChange={setSubjectIdInput}
          onSubmit={handleFiltersSubmit}
        />
      </div>

      <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Subject
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Version
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Source event
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Features (clés)
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Computed at
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Correlation ID
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {items.map((snapshot) => (
              <tr key={`${snapshot.subject_type}-${snapshot.subject_id}-${snapshot.computed_at}`}>
                <td className="px-4 py-3 text-sm font-medium text-slate-800">
                  {snapshot.subject_type} #{snapshot.subject_id}
                </td>
                <td className="px-4 py-3 text-sm text-slate-700">{snapshot.version}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{snapshot.source_event}</td>
                <td className="px-4 py-3 text-sm text-slate-700">
                  {getFeaturesSummary(snapshot.features_json)}
                </td>
                <td className="px-4 py-3 text-sm text-slate-700">
                  {formatDateTime(snapshot.computed_at)}
                </td>
                <td className="px-4 py-3 text-sm text-slate-700">
                  {snapshot.correlation_id ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Filters({
  subjectType,
  subjectIdInput,
  onSubjectTypeChange,
  onSubjectIdChange,
  onSubmit
}: {
  subjectType: RiskSubjectType | '';
  subjectIdInput: string;
  onSubjectTypeChange: (value: RiskSubjectType | '') => void;
  onSubjectIdChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <form className="flex flex-col gap-4 md:flex-row md:items-end md:gap-6" onSubmit={onSubmit}>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700" htmlFor="subject-type">
          Subject type
        </label>
        <select
          id="subject-type"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          value={subjectType}
          onChange={(event) => onSubjectTypeChange(event.target.value as RiskSubjectType | '')}
        >
          <option value="">Tous</option>
          {SUBJECT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700" htmlFor="subject-id">
          Subject ID
        </label>
        <input
          id="subject-id"
          type="number"
          min={0}
          inputMode="numeric"
          value={subjectIdInput}
          onChange={(event) => onSubjectIdChange(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="ex: 1024"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" variant="primary" size="sm">
          Appliquer
        </Button>
      </div>
    </form>
  );
}
