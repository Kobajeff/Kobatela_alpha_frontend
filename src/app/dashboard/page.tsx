'use client';

import Link from 'next/link';
import { extractErrorMessage } from '@/lib/apiClient';
import { RequireScope } from '@/components/system/RequireScope';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { SenderEscrowsSummary } from '@/components/dashboard/SenderEscrowsSummary';
import { ProviderEscrowsSummary } from '@/components/dashboard/ProviderEscrowsSummary';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { useDashboardProviderInboxPreview, useDashboardSentEscrowsPreview } from '@/lib/queries/dashboard';
import type { NormalizedAuthUser } from '@/lib/authIdentity';
import { normalizeScopeValue } from '@/lib/scopes';
import type { EscrowListItemUI } from '@/types/ui';

const SUMMARY_LIMIT = 5;
const ACTIVE_ESCROW_STATUSES = new Set(['ACTIVE', 'FUNDED', 'RELEASABLE']);

function isActiveEscrowStatus(status: string) {
  return ACTIVE_ESCROW_STATUSES.has(status.toUpperCase());
}

function getEscrowStatus(item: { status?: string; escrow_status?: string }): string | undefined {
  if ('status' in item) return item.status;
  return item.escrow_status;
}

function getActiveEscrowCount(items: Array<{ status?: string } | { escrow_status?: string }>): number {
  return items.reduce((count, item) => {
    const status = getEscrowStatus(item);
    if (status && isActiveEscrowStatus(status)) {
      return count + 1;
    }
    return count;
  }, 0);
}

function computeFundsUnderEscrow(escrows: EscrowListItemUI[]) {
  const activeEscrows = escrows.filter((escrow) => isActiveEscrowStatus(escrow.status));
  if (!activeEscrows.length) return null;

  const currencies = new Set(activeEscrows.map((escrow) => escrow.currency).filter(Boolean));
  if (currencies.size !== 1) return null;

  const currency = Array.from(currencies)[0];
  const total = activeEscrows.reduce((sum, escrow) => {
    const value = Number.parseFloat(escrow.amount_total);
    if (!Number.isFinite(value)) return NaN;
    return sum + value;
  }, 0);

  if (!Number.isFinite(total)) return null;
  return { total, currency };
}

function formatAmount(value: number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(value);
}

function DashboardContent({ user }: { user: NormalizedAuthUser }) {
  const senderScope = normalizeScopeValue('sender');
  const providerScope = normalizeScopeValue('provider');
  const canViewSender = user.effectiveScopes.includes(senderScope);
  const canViewProvider = user.effectiveScopes.includes(providerScope);

  const senderEscrows = useDashboardSentEscrowsPreview({
    senderId: user.userId,
    limit: SUMMARY_LIMIT,
    offset: 0,
    enabled: canViewSender
  });
  const providerEscrows = useDashboardProviderInboxPreview({
    limit: SUMMARY_LIMIT,
    offset: 0,
    enabled: canViewProvider
  });

  const senderItems = senderEscrows.data?.items ?? [];
  const providerItems = providerEscrows.data?.items ?? [];

  const senderActiveCount = canViewSender && senderEscrows.isSuccess
    ? getActiveEscrowCount(senderItems)
    : null;
  const providerActiveCount = canViewProvider && providerEscrows.isSuccess
    ? getActiveEscrowCount(providerItems)
    : null;

  const funds = canViewSender && senderEscrows.isSuccess
    ? computeFundsUnderEscrow(senderItems)
    : null;

  const senderSummaryState = canViewSender
    ? senderEscrows.isLoading
      ? { value: '…', helper: 'Chargement' }
      : senderEscrows.isError
        ? { value: '—', helper: 'Erreur de chargement' }
        : { value: senderActiveCount ?? 0, helper: 'Actifs' }
    : { value: '—', helper: 'Accès non disponible' };

  const providerSummaryState = canViewProvider
    ? providerEscrows.isLoading
      ? { value: '…', helper: 'Chargement' }
      : providerEscrows.isError
        ? { value: '—', helper: 'Erreur de chargement' }
        : { value: providerActiveCount ?? 0, helper: 'En cours' }
    : { value: '—', helper: 'Accès non disponible' };

  const fundsSummaryState = canViewSender
    ? senderEscrows.isLoading
      ? { value: '…', helper: 'Chargement' }
      : senderEscrows.isError
        ? { value: '—', helper: 'Erreur de chargement' }
        : funds
          ? { value: `${formatAmount(funds.total)} ${funds.currency}`, helper: 'Fonds sous séquestre' }
          : { value: '—', helper: 'Non disponible' }
    : { value: '—', helper: 'Accès non disponible' };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Tableau de bord unifié</h1>
        <p className="text-slate-600">Vue d’ensemble de vos escrows et de vos fonds.</p>
      </div>

      <SummaryCards
        senderSummary={senderSummaryState}
        providerSummary={providerSummaryState}
        fundsSummary={fundsSummaryState}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">Mes escrows envoyés</CardTitle>
              <p className="text-sm text-slate-500">Aperçu des escrows où vous êtes expéditeur.</p>
            </div>
            <Link
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
              href="/sender/escrows"
            >
              Voir mes escrows envoyés
            </Link>
          </CardHeader>
          <CardContent>
            {!canViewSender ? (
              <p className="text-sm text-slate-500">Accès non disponible.</p>
            ) : senderEscrows.isLoading ? (
              <LoadingState label="Chargement des escrows envoyés..." fullHeight={false} />
            ) : senderEscrows.isError ? (
              <ErrorAlert message={extractErrorMessage(senderEscrows.error)} />
            ) : (
              <SenderEscrowsSummary escrows={senderItems} />
            )}
          </CardContent>
          <CardFooter className="text-right text-sm text-slate-500">
            <span>Affichage limité à {SUMMARY_LIMIT} escrows.</span>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">Mes escrows prestataire</CardTitle>
              <p className="text-sm text-slate-500">Aperçu des escrows où vous êtes prestataire.</p>
            </div>
            <Link
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
              href="/provider/inbox"
            >
              Voir mes escrows prestataire
            </Link>
          </CardHeader>
          <CardContent>
            {!canViewProvider ? (
              <p className="text-sm text-slate-500">Accès non disponible.</p>
            ) : providerEscrows.isLoading ? (
              <LoadingState label="Chargement des escrows prestataire..." fullHeight={false} />
            ) : providerEscrows.isError ? (
              <ErrorAlert message={extractErrorMessage(providerEscrows.error)} />
            ) : (
              <ProviderEscrowsSummary items={providerItems} />
            )}
          </CardContent>
          <CardFooter className="text-right text-sm text-slate-500">
            <span>Affichage limité à {SUMMARY_LIMIT} escrows.</span>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default function UnifiedDashboardPage() {
  return (
    <RequireScope loadingLabel="Chargement du tableau de bord unifié...">
      {(user) => <DashboardContent user={user} />}
    </RequireScope>
  );
}
