'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Query } from '@tanstack/query-core';
import { useParams } from 'next/navigation';
import { isAxiosError } from 'axios';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { LoadingState } from '@/components/common/LoadingState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { extractErrorMessage } from '@/lib/apiClient';
import { normalizeApiError } from '@/lib/apiError';
import { formatDateTime } from '@/lib/format';
import { makeRefetchInterval, pollingProfiles } from '@/lib/pollingDoctrine';
import type { AdminPaymentsResponse } from '@/lib/queries/admin';
import { useAdminPayments, useExecutePayment } from '@/lib/queries/admin';
import { mapPaymentStatusToBadge } from '@/lib/uiMappings';
import type { PaymentUI } from '@/types/ui';

const TERMINAL_PAYMENT_STATUSES = new Set(['SETTLED', 'ERROR', 'REFUNDED']);

type PaymentDetails = PaymentUI;

function formatOptionalDate(value?: string | Date | null) {
  return value ? formatDateTime(value) : '—';
}

export default function AdminPaymentDetailPage() {
  const params = useParams<{ id: string }>();
  const paymentId = params?.id ?? '';
  const executePayment = useExecutePayment();
  const [executeError, setExecuteError] = useState<string | null>(null);
  const [alreadyExecuted, setAlreadyExecuted] = useState(false);
  const [executeLocked, setExecuteLocked] = useState(true);
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const [pollingTimedOut, setPollingTimedOut] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refetchInterval = useCallback(
    (query: Query<AdminPaymentsResponse>) => {
      if (!paymentId) return false;
      const items = query.state.data?.items ?? [];
      const currentPayment = items.find((item) => item.id === paymentId);
      if (!currentPayment) return false;
      const status = String(currentPayment.status ?? '').toUpperCase();
      const isTerminal = TERMINAL_PAYMENT_STATUSES.has(status);
      const shouldPollStatus = status === 'SENT' || (pollingEnabled && !isTerminal);
      if (!shouldPollStatus) return false;
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
      }
      return makeRefetchInterval(
        pollingProfiles.payoutStatus,
        () => Date.now() - (startTimeRef.current ?? Date.now()),
        () => currentPayment
      )();
    },
    [paymentId, pollingEnabled]
  );

  const paymentQuery = useAdminPayments(
    {
      limit: 100,
      offset: 0,
      payment_id: paymentId,
      id: paymentId
    },
    {
      enabled: Boolean(paymentId),
      refetchInterval
    }
  );

  const payment = useMemo(() => {
    const items = paymentQuery.data?.items ?? [];
    return (items.find((item) => item.id === paymentId) ?? null) as
      | PaymentDetails
      | null;
  }, [paymentId, paymentQuery.data?.items]);

  const statusLabel = payment?.status ? String(payment.status).toUpperCase() : null;
  const isTerminalStatus = statusLabel ? TERMINAL_PAYMENT_STATUSES.has(statusLabel) : false;
  const shouldPoll =
    Boolean(payment) &&
    (statusLabel === 'SENT' || (pollingEnabled && !isTerminalStatus));

  useEffect(() => {
    if (!payment) return;
    if (statusLabel === 'PENDING' && !executePayment.isPending && !alreadyExecuted) {
      setExecuteLocked(false);
    } else {
      setExecuteLocked(true);
    }
  }, [alreadyExecuted, executePayment.isPending, payment, statusLabel]);

  useEffect(() => {
    if (!payment || !shouldPoll || isTerminalStatus) {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
      startTimeRef.current = null;
      setPollingTimedOut(false);
      return;
    }

    if (!startTimeRef.current) {
      startTimeRef.current = Date.now();
    }

    if (!timeoutIdRef.current) {
      timeoutIdRef.current = setTimeout(() => {
        setPollingTimedOut(true);
      }, pollingProfiles.payoutStatus.maxDurationMs);
    }

    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
    };
  }, [isTerminalStatus, payment, shouldPoll]);

  useEffect(() => {
    if (isTerminalStatus) {
      setPollingEnabled(false);
    }
  }, [isTerminalStatus]);

  const lastUpdatedAt = paymentQuery.dataUpdatedAt
    ? new Date(paymentQuery.dataUpdatedAt)
    : null;

  const handleRefresh = () => {
    setExecuteError(null);
    paymentQuery.refetch();
  };

  const handleExecute = () => {
    if (!paymentId) return;
    setExecuteError(null);
    setAlreadyExecuted(false);
    setExecuteLocked(true);
    setPollingEnabled(true);
    executePayment.mutate(
      { paymentId },
      {
        onSuccess: () => {
          setExecuteError(null);
          setAlreadyExecuted(false);
          setPollingEnabled(true);
          paymentQuery.refetch();
        },
        onError: (error) => {
          const normalized = normalizeApiError(error);
          if (normalized.status === 409) {
            setAlreadyExecuted(true);
            setExecuteError('Paiement déjà exécuté.');
            setPollingEnabled(true);
          } else if (normalized.status === 403) {
            setExecuteError("Accès refusé : vous n'avez pas le scope requis.");
          } else if (normalized.status === 422) {
            setExecuteError(normalized.message);
          } else {
            setExecuteError(normalized.message);
          }
          paymentQuery.refetch();
        }
      }
    );
  };

  if (paymentQuery.isLoading) {
    return <LoadingState label="Chargement du paiement..." />;
  }

  if (paymentQuery.isError) {
    const status = isAxiosError(paymentQuery.error)
      ? paymentQuery.error.response?.status
      : null;
    const message =
      status === 403
        ? "Accès refusé : vous n'avez pas les droits pour consulter ce paiement."
        : status === 404
        ? 'Paiement introuvable.'
        : extractErrorMessage(paymentQuery.error);
    return (
      <div className="p-4">
        <ErrorAlert message={message} />
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="space-y-3 p-4">
        <ErrorAlert message="Paiement introuvable ou inaccessible." />
        <Button variant="outline" onClick={handleRefresh}>
          Refresh
        </Button>
      </div>
    );
  }

  const badge = payment.status ? mapPaymentStatusToBadge(payment.status) : null;
  const showExecute = !isTerminalStatus;
  const executeDisabled =
    executeLocked || executePayment.isPending || alreadyExecuted || statusLabel !== 'PENDING';
  const pspReference = payment.psp_ref ?? null;
  const idempotencyKey = payment.idempotency_key ?? null;

  return (
    <div className="space-y-6">
      {pollingTimedOut && (
        <div className="flex flex-col gap-2 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between">
          <span>La mise à jour automatique a été suspendue. Rafraîchissez pour obtenir le dernier statut.</span>
          <Button variant="outline" onClick={handleRefresh}>
            Refresh
          </Button>
        </div>
      )}
      {executeError && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-800">
          {executeError}
        </div>
      )}
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Payment {payment.id}</h2>
            <div className="mt-1 flex items-center gap-2 text-sm text-slate-600">
              <span>Statut :</span>
              {badge ? <Badge variant={badge.variant}>{badge.label}</Badge> : <Badge variant="neutral">—</Badge>}
            </div>
          </div>
          <div className="text-right text-sm text-slate-500">
            <p>Créé le {formatOptionalDate(payment.created_at)}</p>
            {payment.updated_at && <p>Mis à jour le {formatOptionalDate(payment.updated_at)}</p>}
            {lastUpdatedAt && <p>Last updated : {formatOptionalDate(lastUpdatedAt)}</p>}
          </div>
        </div>
        <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase text-slate-500">Montant</p>
            <p className="font-medium">
              {payment.amount ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Escrow</p>
            <p className="font-medium">{payment.escrow_id ?? '—'}</p>
          </div>
        </div>
        <div className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs uppercase text-slate-500">Identifiants PSP (ops uniquement)</p>
          <dl className="mt-2 space-y-2 text-sm text-slate-700">
            <div className="flex items-start justify-between gap-2">
              <dt className="text-slate-500">Référence PSP</dt>
              <dd className="font-medium break-all text-right">{pspReference ?? '—'}</dd>
            </div>
            <div className="flex items-start justify-between gap-2">
              <dt className="text-slate-500">Clé d'idempotence</dt>
              <dd className="font-medium break-all text-right">{idempotencyKey ?? '—'}</dd>
            </div>
          </dl>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={handleRefresh}>
            Refresh
          </Button>
          {showExecute && (
            <Button onClick={handleExecute} disabled={executeDisabled}>
              {executePayment.isPending ? (
                <>
                  <span className="mr-2 inline-flex h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Exécution...
                </>
              ) : (
                'Execute payout'
              )}
            </Button>
          )}
          {alreadyExecuted && (
            <span className="text-sm text-amber-700">
              Exécution déjà effectuée.
            </span>
          )}
        </div>
        {!showExecute && (
          <p className="mt-3 text-sm text-slate-600">
            Ce paiement est terminé. Aucune exécution manuelle n’est disponible.
          </p>
        )}
      </section>
    </div>
  );
}
