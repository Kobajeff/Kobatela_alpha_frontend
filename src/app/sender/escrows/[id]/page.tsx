'use client';

// Detail page for a specific escrow, exposing lifecycle actions.
import { useEffect, useMemo, useState } from 'react';
import type { Route } from 'next';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { SenderEscrowDetails } from '@/components/sender/SenderEscrowDetails';
import { ProofForm } from '@/components/sender/ProofForm';
import { extractErrorMessage } from '@/lib/apiClient';
import {
  useCheckDeadline,
  useClientApprove,
  useClientReject,
  useCreateFundingSession,
  useDepositEscrow,
  useMarkDelivered,
  useProofReviewPolling,
  useRequestAdvisorReview,
  useSenderEscrowSummary
} from '@/lib/queries/sender';
import { useToast } from '@/components/ui/ToastProvider';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { useForbiddenAction } from '@/lib/hooks/useForbiddenAction';
import { Button } from '@/components/ui/Button';
import { invalidateEscrowSummary } from '@/lib/queryInvalidation';
import { invalidateEscrowBundle } from '@/lib/invalidation';
import { useQueryClient } from '@tanstack/react-query';
import { normalizeApiError } from '@/lib/apiError';
import { isDirectDepositEnabled } from '@/lib/config';
import { isFundingInProgress, isFundingTerminal } from '@/lib/escrowFunding';

export default function SenderEscrowDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const escrowId = params?.id ?? '';
  const [fundingInProgress, setFundingInProgress] = useState(false);
  const [fundingStartedAt, setFundingStartedAt] = useState<number | null>(null);
  const [fundingElapsedMs, setFundingElapsedMs] = useState(0);
  const [pspReturnMode, setPspReturnMode] = useState(false);
  const [pspReturnStartedAt, setPspReturnStartedAt] = useState<number | null>(null);
  const [pspReturnElapsedMs, setPspReturnElapsedMs] = useState(0);
  const [pspReturnTimedOut, setPspReturnTimedOut] = useState(false);
  const query = useSenderEscrowSummary(
    escrowId,
    fundingInProgress ? { fundingInProgress: true } : undefined
  );
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [fundingError, setFundingError] = useState<string | null>(null);
  const [depositError, setDepositError] = useState<string | null>(null);
  const [fundingNote, setFundingNote] = useState<string | null>(null);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>('');
  const [latestProofId, setLatestProofId] = useState<string | null>(null);
  const [proofRequestMessage, setProofRequestMessage] = useState<{
    tone: 'success' | 'info' | 'error';
    text: string;
  } | null>(null);
  const [proofRequestPendingId, setProofRequestPendingId] = useState<string | null>(null);
  const { showToast } = useToast();
  const { forbidden, forbiddenMessage, forbiddenCode, forbidWith } = useForbiddenAction();
  const proofReview = useProofReviewPolling(latestProofId, escrowId);
  const directDepositEnabled = isDirectDepositEnabled();
  const polling = query.polling;
  const banners = useMemo(
    () =>
      [
        polling?.fundingActive ? 'Traitement PSP' : null,
        polling?.milestoneActive ? 'Mise à jour en cours' : null,
        polling?.payoutActive ? 'Traitement payout' : null
      ].filter((label): label is string => Boolean(label)),
    [polling?.fundingActive, polling?.milestoneActive, polling?.payoutActive]
  );

  const markDelivered = useMarkDelivered(escrowId);
  const approve = useClientApprove(escrowId);
  const reject = useClientReject(escrowId);
  const checkDeadline = useCheckDeadline(escrowId);
  const createFundingSession = useCreateFundingSession(escrowId);
  const depositEscrow = useDepositEscrow(escrowId);
  const requestAdvisorReview = useRequestAdvisorReview();
  const isFundingTerminalState = isFundingTerminal(query.data);
  const isFundingActiveState = isFundingInProgress(query.data) || fundingInProgress;
  const PSP_RETURN_TIMEOUT_MS = 60_000;

  useEffect(() => {
    const hasReturnParam = searchParams.get('return_from_psp');
    if (!hasReturnParam || pspReturnMode) return;

    setPspReturnMode(true);
    setPspReturnTimedOut(false);
    setPspReturnStartedAt(Date.now());

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('return_from_psp');
    const nextUrl = nextParams.toString() ? `${pathname}?${nextParams}` : pathname;
    router.replace(nextUrl as Route, { scroll: false });
  }, [pathname, pspReturnMode, router, searchParams]);

  useEffect(() => {
    if (isFundingTerminalState) {
      setFundingInProgress(false);
      setFundingStartedAt(null);
      setFundingElapsedMs(0);
      setPspReturnMode(false);
      setPspReturnStartedAt(null);
      setPspReturnElapsedMs(0);
      setPspReturnTimedOut(false);
    }
  }, [isFundingTerminalState]);

  useEffect(() => {
    if (!isFundingActiveState) return;
    setFundingStartedAt((prev) => prev ?? Date.now());
  }, [isFundingActiveState]);

  useEffect(() => {
    if (!isFundingActiveState || !fundingStartedAt) {
      setFundingElapsedMs(0);
      return;
    }
    const updateElapsed = () => {
      setFundingElapsedMs(Date.now() - fundingStartedAt);
    };
    updateElapsed();
    const intervalId = setInterval(updateElapsed, 1000);
    return () => clearInterval(intervalId);
  }, [isFundingActiveState, fundingStartedAt]);

  useEffect(() => {
    if (!pspReturnMode) {
      setPspReturnElapsedMs(0);
      return;
    }
    if (!pspReturnStartedAt) return;
    const updateElapsed = () => {
      setPspReturnElapsedMs(Date.now() - pspReturnStartedAt);
    };
    updateElapsed();
    const intervalId = setInterval(updateElapsed, 1000);
    return () => clearInterval(intervalId);
  }, [pspReturnMode, pspReturnStartedAt]);

  useEffect(() => {
    if (!pspReturnMode) return;
    if (isFundingTerminalState) {
      setPspReturnMode(false);
      setPspReturnStartedAt(null);
      setPspReturnElapsedMs(0);
      setPspReturnTimedOut(false);
      return;
    }
    const intervalId = setInterval(() => {
      void query.refetch();
    }, 2000);
    return () => clearInterval(intervalId);
  }, [isFundingTerminalState, pspReturnMode, query]);

  useEffect(() => {
    if (!pspReturnMode) return;
    if (pspReturnElapsedMs < PSP_RETURN_TIMEOUT_MS) return;
    setPspReturnMode(false);
    setPspReturnStartedAt(null);
    setPspReturnElapsedMs(0);
    setPspReturnTimedOut(true);
  }, [pspReturnElapsedMs, pspReturnMode]);

  const handleAction = async (action: () => Promise<unknown>, successMessage: string) => {
    setActionError(null);
    try {
      await action();
      showToast(successMessage, 'success');
    } catch (err) {
      const normalized = forbidWith(err);
      const message = normalized.message ?? extractErrorMessage(err);
      setActionError(message);
      showToast(message, 'error');
    }
  };

  const handleMarkDelivered = () => {
    if (!window.confirm('Are you sure you want to mark this escrow as delivered?')) return;
    return handleAction(() => markDelivered.mutateAsync(), 'Escrow updated successfully');
  };

  const handleApprove = () => {
    if (!window.confirm('Are you sure you want to approve this escrow?')) return;
    return handleAction(() => approve.mutateAsync(), 'Escrow updated successfully');
  };

  const handleReject = () => {
    if (!window.confirm('Are you sure you want to reject this escrow?')) return;
    return handleAction(() => reject.mutateAsync(), 'Escrow updated successfully');
  };

  const handleRequestAdvisorReview = async (proofId: string) => {
    setProofRequestMessage(null);
    setProofRequestPendingId(proofId);
    try {
      await requestAdvisorReview.mutateAsync({ proofId, escrowId });
      const successMessage = 'Advisor review requested.';
      setProofRequestMessage({ tone: 'success', text: successMessage });
      showToast(successMessage, 'success');
    } catch (error) {
      const normalized = normalizeApiError(error);
      const message = (() => {
        if (normalized.status === 409) {
          return 'Advisor review already requested.';
        }
        if (normalized.status === 403) {
          return 'Access denied: you cannot request advisor review.';
        }
        if (normalized.status === 404) {
          return 'Proof not found.';
        }
        if (normalized.status === 401) {
          return 'Your session has expired. Please sign in again.';
        }
        return normalized.message ?? extractErrorMessage(error);
      })();
      setProofRequestMessage({
        tone: normalized.status === 409 ? 'info' : 'error',
        text: message
      });
      showToast(message, normalized.status === 409 ? 'info' : 'error');
    } finally {
      setProofRequestPendingId(null);
    }
  };

  const resolveFundingErrorMessage = (error: unknown) => {
    const normalized = normalizeApiError(error);
    if (normalized.status === 403) {
      return 'Accès refusé : vous ne pouvez pas financer cet escrow.';
    }
    if (normalized.status === 404) {
      return "Escrow introuvable. Vérifiez l'identifiant.";
    }
    if (normalized.status === 409) {
      return 'Already processed / state advanced. The status will refresh.';
    }
    if (normalized.status === 422) {
      return extractErrorMessage(error);
    }
    if (normalized.status === 401) {
      return 'Votre session a expiré. Merci de vous reconnecter.';
    }
    return normalized.message ?? extractErrorMessage(error);
  };

  const refreshEscrowBundle = () =>
    invalidateEscrowBundle(queryClient, {
      escrowId,
      viewer: 'sender',
      refetchSummary: true
    });

  const generateIdempotencyKey = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    throw new Error('Unable to generate idempotency key.');
  };

  const handleFundingSession = async () => {
    setFundingError(null);
    setDepositError(null);
    setFundingNote(null);
    setFundingInProgress(true);
    setFundingStartedAt(Date.now());
    try {
      await createFundingSession.mutateAsync();
      showToast('Session PSP créée. Suivez les instructions de paiement.', 'success');
      setFundingNote('Session PSP créée. Suivez les instructions de paiement de votre PSP.');
      refreshEscrowBundle();
    } catch (error) {
      const message = resolveFundingErrorMessage(error);
      setFundingError(message);
      showToast(message, 'error');
      setFundingInProgress(false);
      refreshEscrowBundle();
    }
  };

  const handleDeposit = async () => {
    setDepositError(null);
    setFundingError(null);
    setFundingNote(null);
    setFundingInProgress(true);
    setFundingStartedAt(Date.now());
    try {
      const idempotencyKey = generateIdempotencyKey();
      await depositEscrow.mutateAsync({ idempotencyKey });
      showToast('Dépôt envoyé. En attente de confirmation.', 'success');
      refreshEscrowBundle();
    } catch (error) {
      const message = resolveFundingErrorMessage(error);
      setDepositError(message);
      showToast(message, 'error');
      refreshEscrowBundle();
      setFundingInProgress(false);
    }
  };

  if (query.isLoading) {
    return <LoadingState label="Chargement de l'escrow..." />;
  }

  if (query.isError) {
    const status = axios.isAxiosError(query.error) ? query.error.response?.status : null;
    const statusMessage = (() => {
      if (status === 403) {
        return "Accès restreint : vous ne pouvez pas consulter ce résumé d'escrow.";
      }
      if (status === 404 || status === 410) {
        return 'Ressource indisponible : cet escrow est introuvable ou archivé.';
      }
      return null;
    })();
    return (
      <div className="p-4">
        <ErrorAlert message={statusMessage ?? extractErrorMessage(query.error)} />
      </div>
    );
  }

  const data = query.data;

  if (!data) {
    return null;
  }

  const loading =
    markDelivered.isPending || approve.isPending || reject.isPending || checkDeadline.isPending;
  const lastUpdatedAt = query.dataUpdatedAt ? new Date(query.dataUpdatedAt) : null;
  const hasProcessing = Boolean(
    polling?.fundingActive || polling?.milestoneActive || polling?.payoutActive
  );
  const refreshSummary = () => invalidateEscrowSummary(queryClient, escrowId);

  const proofForm = (
    <div className="space-y-3 rounded-md border border-slate-100 bg-slate-50 p-4">
      {data.milestones.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-slate-700">Associer à un jalon</label>
          <select
            value={selectedMilestoneId}
            onChange={(event) => setSelectedMilestoneId(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm"
          >
            <option value="">Aucun</option>
            {data.milestones.map((milestone) => (
              <option key={milestone.id} value={milestone.id}>
                {milestone.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <ProofForm
        escrowId={escrowId}
        milestoneId={selectedMilestoneId || undefined}
        onProofCreated={setLatestProofId}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      {actionError && <p className="text-sm text-rose-600">{actionError}</p>}
      {pspReturnMode && (
        <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
          <span>Vérification du paiement…</span>
        </div>
      )}
      {banners.map((label) => (
        <div key={label} className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          {label}
        </div>
      ))}
      {pspReturnTimedOut && !isFundingTerminalState && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          Still processing — this can take a few minutes.
        </div>
      )}
      {polling?.timedOut && (
        <div className="flex flex-col gap-2 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between">
          <span>La mise à jour automatique a été suspendue. Rafraîchissez pour obtenir le dernier statut.</span>
          <Button variant="outline" onClick={refreshSummary}>
            Refresh
          </Button>
        </div>
      )}
      <SenderEscrowDetails
        summary={data}
        loading={loading}
        processing={hasProcessing}
        fundingProcessing={isFundingActiveState}
        fundingElapsedMs={fundingElapsedMs}
        fundingRefreshPending={query.isFetching}
        onFundingRefresh={!isFundingTerminalState ? refreshSummary : undefined}
        fundingSessionPending={createFundingSession.isPending}
        depositPending={depositEscrow.isPending}
        fundingError={fundingError}
        depositError={depositError}
        fundingNote={fundingNote}
        showDirectDeposit={directDepositEnabled}
        onStartFundingSession={handleFundingSession}
        onDirectDeposit={directDepositEnabled ? handleDeposit : undefined}
        lastUpdatedAt={lastUpdatedAt}
        proofReviewActive={proofReview.polling.active}
        proofReviewError={proofReview.polling.errorMessage ?? null}
        onRequestAdvisorReview={handleRequestAdvisorReview}
        proofRequestMessage={proofRequestMessage}
        proofRequestPendingId={proofRequestPendingId}
        onMarkDelivered={handleMarkDelivered}
        onApprove={handleApprove}
        onReject={handleReject}
        onCheckDeadline={() => handleAction(() => checkDeadline.mutateAsync(), 'Escrow updated successfully')}
        forbidden={forbidden}
        forbiddenTitle={forbiddenMessage}
        forbiddenCode={forbiddenCode}
        proofForm={proofForm}
      />
    </div>
  );
}
