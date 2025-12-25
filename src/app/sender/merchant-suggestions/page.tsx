'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { Route } from 'next';
import { useMerchantSuggestionsList } from '@/lib/queries/sender';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { extractErrorMessage, isForbiddenError } from '@/lib/apiClient';

const DEFAULT_LIMIT = 10;

export default function MerchantSuggestionsPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const limit = useMemo(
    () => Number(searchParams?.get('limit')) || DEFAULT_LIMIT,
    [searchParams]
  );
  const offset = useMemo(() => Number(searchParams?.get('offset')) || 0, [searchParams]);

  const { data, isLoading, isError, error, refetch } = useMerchantSuggestionsList({
    limit,
    offset
  });

  const handlePageChange = (direction: 'next' | 'prev') => {
    const nextOffset =
      direction === 'next'
        ? offset + limit
        : Math.max(0, offset - limit);

    const params = new URLSearchParams(searchParams?.toString());
    params.set('limit', String(limit));
    params.set('offset', String(nextOffset));
    router.push(`${pathname}?${params.toString()}` as Route);
  };

  const isForbidden = isError && isForbiddenError(error);
  const accessDeniedMessage = 'Access denied.';

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

  const { items, total } = data;
  const start = total === 0 ? 0 : Math.min(offset + 1, total);
  const end = total === 0 ? 0 : Math.min(offset + limit, total);
  const hasNext = offset + limit < total;
  const hasPrevious = offset > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Suggestions de commerçants</h1>
          <p className="text-sm text-slate-600">
            Proposez de nouveaux commerçants à ajouter sur Kobatela ou suivez vos suggestions existantes.
          </p>
        </div>
        <Link href="/sender/merchant-suggestions/new">
          <Button>Nouvelle suggestion</Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-lg">Vos suggestions</CardTitle>
          <div className="text-sm text-slate-600">
            Résultats {start} - {end} sur {total}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.length === 0 ? (
            <p className="text-sm text-slate-600">Aucune suggestion pour l&apos;instant.</p>
          ) : (
            <div className="overflow-hidden rounded-md border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">ID</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Statut</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Créé le</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {items.map((suggestion) => (
                    <tr
                      key={suggestion.id}
                      className="cursor-pointer hover:bg-indigo-50"
                      onClick={() => router.push(`/sender/merchant-suggestions/${suggestion.id}`)}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-indigo-700">{suggestion.id}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{suggestion.status ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {suggestion.created_at ? new Date(suggestion.created_at).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Button variant="outline" disabled={!hasPrevious} onClick={() => handlePageChange('prev')}>
              Précédent
            </Button>
            <span className="text-sm text-slate-600">
              Page {Math.floor(offset / limit) + 1}
            </span>
            <Button variant="outline" disabled={!hasNext} onClick={() => handlePageChange('next')}>
              Suivant
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
