'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMerchantSuggestionsList } from '@/lib/queries/sender';
import type { MerchantSuggestion, MerchantSuggestionStatus } from '@/types/api';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { extractErrorMessage, isForbiddenError } from '@/lib/apiClient';

const STATUS_OPTIONS: MerchantSuggestionStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];
const PAGE_SIZE = 10;

const statusBadgeMap: Record<MerchantSuggestionStatus, { label: string; variant: 'warning' | 'success' | 'danger' }> = {
  PENDING: { label: 'PENDING', variant: 'warning' },
  APPROVED: { label: 'APPROVED', variant: 'success' },
  REJECTED: { label: 'REJECTED', variant: 'danger' }
};

export default function MerchantSuggestionsPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<'all' | MerchantSuggestionStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, refetch } = useMerchantSuggestionsList();

  const isForbidden = isError && isForbiddenError(error);
  const accessDeniedMessage = 'Accès restreint.';

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredItems = useMemo(() => {
    const items = data ?? [];
    const byStatus =
      statusFilter === 'all' ? items : items.filter((item) => item.status === statusFilter);
    if (!normalizedSearch) return byStatus;
    return byStatus.filter((item) => {
      const name = item.name?.toLowerCase() ?? '';
      const country = item.country_code?.toLowerCase() ?? '';
      const id = item.id?.toString().toLowerCase() ?? '';
      return name.includes(normalizedSearch) || country.includes(normalizedSearch) || id.includes(normalizedSearch);
    });
  }, [data, normalizedSearch, statusFilter]);

  if (isLoading) {
    return <LoadingState label="Chargement des suggestions..." />;
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <ErrorAlert message={isForbidden ? accessDeniedMessage : extractErrorMessage(error)} />
        {!isForbidden && (
          <Button variant="outline" onClick={() => refetch()}>
            Réessayer
          </Button>
        )}
      </div>
    );
  }

  if (!data) return null;

  const totalItems = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pagedItems = filteredItems.slice(startIndex, startIndex + PAGE_SIZE);
  const pageStart = totalItems === 0 ? 0 : startIndex + 1;
  const pageEnd = Math.min(startIndex + PAGE_SIZE, totalItems);

  const handleFilterChange = (value: 'all' | MerchantSuggestionStatus) => {
    setStatusFilter(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Vos marchands</h1>
          <p className="text-sm text-slate-600">
            Vous pouvez suggérer un prestataire ou un marchand à intégrer dans notre plateforme.
          </p>
        </div>
        <Link href="/sender/merchant-suggestions/new">
          <Button>+ Proposer un marchand</Button>
        </Link>
      </div>

      <div className="rounded-lg border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
        <div className="flex items-start gap-3">
          <span className="text-lg">💡</span>
          <p>Vous pouvez suggérer un prestataire ou un marchand à intégrer dans notre plateforme.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <CardTitle className="text-lg">Vos suggestions</CardTitle>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex w-full flex-col gap-3 md:flex-row md:items-center">
              <div className="flex w-full items-center gap-2 md:w-auto">
                <span className="text-sm text-slate-600">Filtrer par :</span>
                <Select
                  className="md:w-56"
                  value={statusFilter}
                  onChange={(event) => handleFilterChange(event.target.value as 'all' | MerchantSuggestionStatus)}
                >
                  <option value="all">Tous les statuts</option>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="w-full md:max-w-xs">
                <Input
                  placeholder="Rechercher une suggestion..."
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>
            <Link href="/sender/merchant-suggestions/new">
              <Button>+ Proposer un marchand</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {totalItems === 0 ? (
            <div className="rounded-md border border-dashed border-slate-200 p-6 text-center text-sm text-slate-600">
              <p>Aucune suggestion pour le moment.</p>
              <div className="mt-4">
                <Link href="/sender/merchant-suggestions/new">
                  <Button>+ Proposer un marchand</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Prestataire / Marchand
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Statut de la suggestion
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Proposée le
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {pagedItems.map((suggestion: MerchantSuggestion) => (
                    <tr key={suggestion.id} className="hover:bg-indigo-50">
                      <td className="px-4 py-3 text-sm text-slate-700">
                        <div className="font-medium text-slate-900">{suggestion.name ?? '—'}</div>
                        <div className="text-xs text-slate-500">{suggestion.country_code ?? '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {suggestion.status ? (
                          <Badge variant={statusBadgeMap[suggestion.status].variant}>
                            {statusBadgeMap[suggestion.status].label}
                          </Badge>
                        ) : (
                          <Badge variant="muted">—</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {suggestion.created_at
                          ? new Date(suggestion.created_at).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="outline"
                          onClick={() => router.push(`/sender/merchant-suggestions/${suggestion.id}`)}
                        >
                          Voir
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-col gap-3 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
            <div>
              {pageStart} - {pageEnd} sur {totalItems} suggestion{totalItems > 1 ? 's' : ''}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" disabled={currentPage <= 1} onClick={() => setPage((prev) => prev - 1)}>
                ‹
              </Button>
              <span className="min-w-[32px] text-center">{currentPage}</span>
              <Button variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage((prev) => prev + 1)}>
                ›
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-slate-500">
        Besoin d&apos;aide ?{' '}
        <Link className="font-medium text-indigo-600 hover:text-indigo-500" href="mailto:support@kobatela.com">
          Contactez notre support
        </Link>
      </div>
    </div>
  );
}
