'use client';

// Page showing all escrows for the logged-in sender.
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { extractErrorMessage } from '@/lib/apiClient';
import { SenderEscrowList } from '@/components/sender/SenderEscrowList';
import { useSenderEscrows } from '@/lib/queries/sender';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import type { EscrowStatus } from '@/types/api';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorAlert } from '@/components/common/ErrorAlert';

const STATUS_OPTIONS: { label: string; value: '' | EscrowStatus }[] = [
  { label: 'Tous les statuts', value: '' },
  { label: 'Brouillon', value: 'DRAFT' },
  { label: 'Actif', value: 'ACTIVE' },
  { label: 'Financé', value: 'FUNDED' },
  { label: 'Prêt à libérer', value: 'RELEASABLE' },
  { label: 'Libéré', value: 'RELEASED' },
  { label: 'Remboursé', value: 'REFUNDED' },
  { label: 'Annulé', value: 'CANCELLED' }
];

export default function SenderEscrowsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'' | EscrowStatus>('');
  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    setPage(1);
  }, [status]);

  const offset = useMemo(() => (page - 1) * limit, [page, limit]);
  const query = useSenderEscrows({ status: status || undefined, limit, offset });

  if (query.isLoading) {
    return <LoadingState label="Chargement des escrows..." />;
  }

  if (query.isError) {
    return (
      <div className="p-4">
        <ErrorAlert message={extractErrorMessage(query.error)} />
      </div>
    );
  }

  const data = query.data;

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Mes escrows</h1>
        <Button onClick={() => router.push('/sender/escrows/create')}>Créer un escrow</Button>
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
