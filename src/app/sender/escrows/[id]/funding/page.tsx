'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { extractErrorMessage } from '@/lib/apiClient';
import { formatDateTime } from '@/lib/format';
import { mapEscrowStatusToBadge } from '@/lib/uiMappings';
import { useDepositEscrow, useSenderEscrowSummary } from '@/lib/queries/sender';
import { canAction } from '@/policy/allowedActions';

export default function SenderEscrowFundingPage() {
  const params = useParams<{ id: string }>();
  const escrowId = params?.id ?? '';
  const summaryQuery = useSenderEscrowSummary(escrowId);
  const deposit = useDepositEscrow(escrowId);
  const idempotencyKeyRef = useRef<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState(false);

  const escrow = summaryQuery.data?.escrow;
  const viewerContext = summaryQuery.data?.viewer_context;
  const canFund = canAction(viewerContext, 'FUND_ESCROW');

  const bannerContent = useMemo(() => {
    if (escrow?.status === 'ACTIVE') {
      return {
        title: 'Escrow activé',
        description:
          'Votre escrow est maintenant active. Débloquez dès maintenant sa première étape en le finançant.'
      };
    }
    return {
      title: 'Escrow prêt au financement',
      description: 'Votre escrow est prêt à être financée pour lancer le flux de paiement.'
    };
  }, [escrow?.status]);

  const handleDeposit = async () => {
    if (!escrow) return;
    setActionError(null);
    setActionSuccess(false);
    if (!escrow.amount_total) {
      setActionError('Montant indisponible pour le financement.');
      return;
    }
    const idempotencyKey = idempotencyKeyRef.current ?? crypto.randomUUID();
    idempotencyKeyRef.current = idempotencyKey;
    try {
      await deposit.mutateAsync({ idempotencyKey, amount: escrow.amount_total });
      setActionSuccess(true);
    } catch (error) {
      setActionError(extractErrorMessage(error));
    }
  };

  if (summaryQuery.isLoading) {
    return <LoadingState label="Chargement du financement..." />;
  }

  if (summaryQuery.isError) {
    const status = axios.isAxiosError(summaryQuery.error)
      ? summaryQuery.error.response?.status
      : null;
    const message =
      status === 403 ? 'Accès restreint.' : extractErrorMessage(summaryQuery.error);
    return (
      <div className="p-4">
        <ErrorAlert message={message} />
      </div>
    );
  }

  if (!escrow) {
    return null;
  }

  const statusBadge = mapEscrowStatusToBadge(escrow.status);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Financement de l&apos;escrow</h1>
        <Link
          href={`/sender/escrows/${escrowId}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-800"
        >
          <span aria-hidden="true">←</span>
          Retour aux détails de l&apos;escrow
        </Link>
      </div>

      <Card className="border-emerald-200 bg-emerald-50">
        <CardContent className="flex gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white">
            <span className="text-lg">✓</span>
          </div>
          <div>
            <p className="text-base font-semibold text-emerald-900">{bannerContent.title}</p>
            <p className="mt-1 text-sm text-emerald-800">{bannerContent.description}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Montant à financer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-700">
            <div className="space-y-1">
              <p className="text-3xl font-semibold text-slate-900">
                {escrow.amount_total} {escrow.currency}
              </p>
              <p className="text-sm text-slate-600">
                Prestataire de paiement: plateforme de paiement
              </p>
            </div>

            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              Les fonds seront déposés de manière sécurisée sur la plateforme de paiement associée à
              votre escrow. Une fois le dépôt confirmé, vous pourrez suivre l&apos;avancement dans les
              détails de l&apos;escrow.
            </div>

            {actionSuccess && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                Le financement a bien été enregistré.{' '}
                <Link
                  className="font-semibold text-emerald-800 underline underline-offset-2"
                  href={`/sender/escrows/${escrowId}`}
                >
                  Retour aux détails de l&apos;escrow
                </Link>
              </div>
            )}

            {actionError && (
              <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                {actionError}
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleDeposit}
              disabled={deposit.isPending || !canFund}
            >
              {deposit.isPending && (
                <span className="mr-2 inline-flex h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              Financer l&apos;escrow
            </Button>
            <p className="text-xs text-slate-500">
              Le financement sera traité par la plateforme de paiement.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Résumé de l&apos;escrow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">ID</span>
              <span className="font-semibold text-slate-900">Escrow #{escrow.id}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Montant</span>
              <span className="font-semibold text-slate-900">
                {escrow.amount_total} {escrow.currency}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Statut</span>
              <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Échéance</span>
              <span className="font-semibold text-slate-900">
                {escrow.deadline_at ? formatDateTime(escrow.deadline_at) : '—'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
