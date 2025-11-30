'use client';

// Page showing all escrows for the logged-in sender.
import { useEffect, useMemo, useState } from 'react';
import { extractErrorMessage } from '@/lib/apiClient';
import { SenderEscrowList } from '@/components/sender/SenderEscrowList';
import { useSenderEscrows } from '@/lib/queries/sender';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import type { EscrowStatus } from '@/types/api';

const STATUS_OPTIONS: { label: string; value: '' | EscrowStatus }[] = [
  { label: 'Tous les statuts', value: '' },
  { label: 'Actif', value: 'active' },
  { label: 'Terminé', value: 'completed' },
  { label: 'Annulé', value: 'cancelled' },
  { label: 'En litige', value: 'disputed' },
  { label: 'Brouillon', value: 'draft' },
  { label: 'Expiré', value: 'expired' }
];

export default function SenderEscrowsPage() {
  const [status, setStatus] = useState<'' | EscrowStatus>('');
  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    setPage(1);
  }, [status]);

  const offset = useMemo(() => (page - 1) * limit, [page, limit]);
  const query = useSenderEscrows({ status: status || undefined, limit, offset });

  if (query.isLoading) {
    return <div className="flex h-full items-center justify-center">Loading...</div>;
  }

  if (query.isError) {
    return (
      <div className="p-4">
        <div className="my-4 rounded bg-red-100 p-4 text-red-700">
          {extractErrorMessage(query.error)}
        </div>
      </div>
    );
  }

  const data = query.data;

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Mes escrows</h1>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-lg">Filtrer</CardTitle>
          <div className="w-full max-w-xs">
            <Select
              value={status}
              onChange={(event) => setStatus(event.target.value as EscrowStatus | '')}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <SenderEscrowList escrows={data} />
          <div className="mt-4 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
            >
              Précédent
            </Button>
            <p className="text-sm text-slate-600">Page {page}</p>
            <Button
              variant="outline"
              onClick={() => setPage((current) => current + 1)}
              disabled={data.length < limit}
            >
              Suivant
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
