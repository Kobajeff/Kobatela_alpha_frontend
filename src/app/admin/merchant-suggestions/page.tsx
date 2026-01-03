'use client';

import { useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { LoadingState } from '@/components/common/LoadingState';
import { useToast } from '@/components/ui/ToastProvider';
import {
  useAdminMerchantSuggestions,
  useApproveMerchantSuggestion,
  usePromoteMerchantSuggestion,
  useRejectMerchantSuggestion
} from '@/lib/queries/admin';
import { extractErrorMessage } from '@/lib/apiClient';
import type { MerchantSuggestion } from '@/types/api';

type SuggestionAction = 'approve' | 'reject' | 'promote';

const STATUS_TABS = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Promoted', value: 'promoted' }
];

function getStatusVariant(status?: string) {
  const normalized = String(status || '').toUpperCase();
  if (normalized.includes('APPROVED')) return 'success';
  if (normalized.includes('REJECT')) return 'danger';
  if (normalized.includes('PROMOT')) return 'info';
  if (normalized.includes('PENDING')) return 'warning';
  return 'neutral';
}

function isActionable(status?: string) {
  if (!status) return true;
  const normalized = status.toUpperCase();
  return normalized.includes('PENDING');
}

function bestEffortDisplayName(suggestion?: MerchantSuggestion | null) {
  if (!suggestion) return '';
  if (suggestion.name) return suggestion.name;
  const metadata = suggestion.metadata;
  if (metadata && typeof metadata['name'] === 'string') {
    const value = String(metadata['name']).trim();
    if (value) return value;
  }
  return '';
}

function bestEffortCountry(suggestion?: MerchantSuggestion | null) {
  if (!suggestion) return '';
  if (suggestion.country_code) return suggestion.country_code;
  const metadata = suggestion.metadata;
  if (metadata && typeof metadata['country'] === 'string') {
    const value = String(metadata['country']).trim();
    if (value) return value;
  }
  return '';
}

function truncateId(id: string) {
  if (id.length <= 10) return id;
  return `${id.slice(0, 6)}...${id.slice(-4)}`;
}

function normalizeError(error: unknown) {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 401 || status === 403) {
      return 'Access denied';
    }
    if (status === 404) {
      return 'Resource not found';
    }
    if (status === 409) {
      return 'Already processed';
    }
    if (status === 422) {
      return extractErrorMessage(error);
    }
  }
  return extractErrorMessage(error);
}

export default function AdminMerchantSuggestionsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<MerchantSuggestion | null>(null);
  const [pendingActionById, setPendingActionById] = useState<Record<string, SuggestionAction | null>>({});
  const query = useAdminMerchantSuggestions({
    limit: 50,
    offset: 0,
    status: statusFilter === 'all' ? undefined : statusFilter,
    q: search || undefined
  });
  const approve = useApproveMerchantSuggestion();
  const reject = useRejectMerchantSuggestion();
  const promote = usePromoteMerchantSuggestion();
  const { showToast } = useToast();

  const items = useMemo(() => query.data?.items ?? [], [query.data?.items]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const filteredByStatus = statusFilter === 'all'
      ? items
      : items.filter((item) => String(item.status || '').toLowerCase().includes(statusFilter.toLowerCase()));
    if (!normalizedSearch) return filteredByStatus;
    return filteredByStatus.filter((item) => {
      const displayName = bestEffortDisplayName(item).toLowerCase();
      const country = bestEffortCountry(item).toLowerCase();
      return (
        item.id.toLowerCase().includes(normalizedSearch) ||
        displayName.includes(normalizedSearch) ||
        country.includes(normalizedSearch)
      );
    });
  }, [items, search, statusFilter]);

  const lastUpdated = query.dataUpdatedAt ? new Date(query.dataUpdatedAt).toLocaleTimeString() : null;

  const mutationPendingId = (id: string) =>
    pendingActionById[id] !== undefined && pendingActionById[id] !== null;

  const setPending = (id: string, action: SuggestionAction | null) => {
    setPendingActionById((prev) => ({ ...prev, [id]: action }));
  };

  const handleAction = async (id: string, action: SuggestionAction) => {
    if (mutationPendingId(id)) return;
    setPending(id, action);
    try {
      if (action === 'approve') {
        await approve.mutateAsync({ id });
      } else if (action === 'reject') {
        const confirmReject = typeof window !== 'undefined' ? window.confirm('Reject this suggestion?') : true;
        if (!confirmReject) {
          setPending(id, null);
          return;
        }
        await reject.mutateAsync({ id });
      } else if (action === 'promote') {
        const confirmPromote = typeof window !== 'undefined' ? window.confirm('Promote this suggestion?') : true;
        if (!confirmPromote) {
          setPending(id, null);
          return;
        }
        await promote.mutateAsync({ id });
      }
      showToast('Action recorded', 'success');
    } catch (error) {
      showToast(normalizeError(error), 'error');
    } finally {
      setPending(id, null);
    }
  };

  const getDisplayName = (suggestion: MerchantSuggestion) => {
    return bestEffortDisplayName(suggestion) || '—';
  };

  const getCountry = (suggestion: MerchantSuggestion) => {
    return bestEffortCountry(suggestion) || '—';
  };

  const getReviewReason = (suggestion: MerchantSuggestion) => {
    const value = (suggestion as { review_reason?: string | null }).review_reason;
    return value && value.trim ? value.trim() : value || '—';
  };

  const isPromotable = (suggestion: MerchantSuggestion) => {
    if (suggestion.promotion_registry_id) return false;
    return isActionable(suggestion.status);
  };

  if (query.isLoading) {
    return (
      <div className="p-6">
        <LoadingState label="Chargement des suggestions marchands..." />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="p-6">
        <ErrorAlert message={normalizeError(query.error)} />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Merchant suggestions</h1>
          <p className="text-sm text-muted-foreground">
            Review and moderate merchant suggestions submitted by senders.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-slate-500">Last updated: {lastUpdated}</span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
          >
            Refresh
          </Button>
        </div>
      </div>

      <Card className="space-y-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_TABS.map((tab) => (
              <Button
                key={tab.value}
                variant={statusFilter === tab.value ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(tab.value)}
              >
                {tab.label}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by id, name, or country"
              className="w-72"
            />
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-200 p-6 text-center text-sm text-slate-600">
            No merchant suggestions found.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-700">ID</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-700">Status</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-700">Created</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-700">Name</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-700">Country</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-700">Promotion</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredItems.map((suggestion) => {
                  const pending = mutationPendingId(suggestion.id);
                  const actionable = isActionable(suggestion.status);
                  return (
                    <tr key={suggestion.id} className="align-top">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs">{truncateId(suggestion.id)}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelected(suggestion)}
                          >
                            View
                          </Button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={getStatusVariant(suggestion.status)}>
                          {suggestion.status || 'Unknown'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {suggestion.created_at
                          ? new Date(suggestion.created_at).toLocaleString()
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{getDisplayName(suggestion)}</td>
                      <td className="px-4 py-3 text-slate-700">{getCountry(suggestion)}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {suggestion.promotion_registry_id ? (
                          <span className="font-mono text-xs">{suggestion.promotion_registry_id}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="primary"
                            disabled={!actionable || pending}
                            onClick={() => handleAction(suggestion.id, 'approve')}
                          >
                            {pendingActionById[suggestion.id] === 'approve' ? 'Approving...' : 'Approve'}
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            disabled={!actionable || pending}
                            onClick={() => handleAction(suggestion.id, 'reject')}
                          >
                            {pendingActionById[suggestion.id] === 'reject' ? 'Rejecting...' : 'Reject'}
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={!isPromotable(suggestion) || pending}
                            onClick={() => handleAction(suggestion.id, 'promote')}
                          >
                            {pendingActionById[suggestion.id] === 'promote' ? 'Promoting...' : 'Promote'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Suggestion details</h2>
                <p className="text-xs text-slate-500">ID: {selected.id}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
                Close
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs uppercase text-slate-500">Status</p>
                <Badge variant={getStatusVariant(selected.status)}>{selected.status || '—'}</Badge>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase text-slate-500">Created</p>
                <p className="text-sm text-slate-700">
                  {selected.created_at ? new Date(selected.created_at).toLocaleString() : '—'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase text-slate-500">Updated</p>
                <p className="text-sm text-slate-700">
                  {selected.updated_at ? new Date(selected.updated_at).toLocaleString() : '—'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase text-slate-500">Promotion registry</p>
                <p className="text-sm text-slate-700">
                  {selected.promotion_registry_id || '—'}
                </p>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <p className="text-xs uppercase text-slate-500">Review reason</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {getReviewReason(selected)}
                </p>
              </div>
            </div>

            <div className="mt-4">
              <details className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <summary className="cursor-pointer font-medium text-slate-800">Raw payload</summary>
                <pre className="mt-3 overflow-x-auto rounded-md bg-black/90 p-3 text-xs text-slate-100">
                  {JSON.stringify(selected, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
