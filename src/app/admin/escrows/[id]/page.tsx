'use client';

// Admin view of a single escrow, showing milestones, proofs, and payments.
import { useParams } from 'next/navigation';
import { extractErrorMessage } from '@/lib/apiClient';
import { useAdminEscrowSummary } from '@/lib/queries/admin';
import { ProofAiStatus } from '@/components/sender/ProofAiStatus';
import { formatDateTime } from '@/lib/format';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { Badge } from '@/components/ui/Badge';
import {
  mapAiRiskToBadge,
  mapEscrowStatusToBadge,
  mapMilestoneStatusToBadge,
  mapPaymentStatusToBadge,
  mapProofStatusToBadge
} from '@/lib/uiMappings';
import axios from 'axios';

export default function AdminEscrowDetailPage() {
  const params = useParams<{ id: string }>();
  const escrowId = params?.id ?? '';
  const query = useAdminEscrowSummary(escrowId);

  if (query.isLoading) {
    return <LoadingState label="Chargement du détail escrow..." />;
  }

  if (query.isError) {
    const scopeMessage = (() => {
      if (axios.isAxiosError(query.error) && query.error.response?.status === 403) {
        return 'Accès refusé : votre compte ne dispose pas du scope requis pour consulter ce résumé.';
      }
      return null;
    })();
    return (
      <div className="p-4">
        <ErrorAlert message={scopeMessage ?? extractErrorMessage(query.error)} />
      </div>
    );
  }

  const data = query.data;
  const escrow = data?.escrow;
  const milestones = data?.milestones ?? [];
  const proofs = data?.proofs ?? [];
  const payments = data?.payments ?? [];
  const formatOptionalDate = (value?: string | Date | null) =>
    value ? formatDateTime(value) : '—';

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Escrow {escrow?.id ?? '—'}</h2>
            <div className="mt-1 flex items-center gap-2 text-sm text-slate-600">
              <span>Statut :</span>
              {(() => {
                if (!escrow?.status) {
                  return <Badge variant="neutral">—</Badge>;
                }
                const badge = mapEscrowStatusToBadge(escrow.status);
                return <Badge variant={badge.variant}>{badge.label}</Badge>;
              })()}
            </div>
          </div>
          <p className="text-sm text-slate-500">Créé le {formatOptionalDate(escrow?.created_at)}</p>
        </div>
        <p className="mt-2 text-slate-700">
          Montant : {escrow?.amount ?? '—'} {escrow?.currency ?? ''}
        </p>
      </section>

      {data.advisor && (
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-2 text-lg font-semibold">Conseiller assigné</h3>
          <p className="text-sm text-muted-foreground">
            Ce conseiller accompagne cet escrow pour les revues et la conformité.
          </p>
          <div className="mt-3 flex flex-col gap-2 text-sm text-slate-700 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold">
                {data.advisor?.first_name ?? '—'} {data.advisor?.last_name ?? ''}
              </p>
              <p className="text-xs text-slate-500">{data.advisor?.email ?? '—'}</p>
            </div>
            <Badge variant="neutral">Conseiller assigné</Badge>
          </div>
        </section>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-3 text-lg font-semibold">Jalons</h3>
        <div className="space-y-2">
          {milestones.map((milestone) => (
            <div key={milestone.id} className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2">
              <div>
                <p className="font-medium">{milestone.name ?? '—'}</p>
                <p className="text-xs text-slate-500">Échéance : {milestone.due_date ?? '—'}</p>
              </div>
              {(() => {
                if (!milestone.status) {
                  return <Badge variant="neutral">—</Badge>;
                }
                const badge = mapMilestoneStatusToBadge(milestone.status);
                return <Badge variant={badge.variant}>{badge.label}</Badge>;
              })()}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-3 text-lg font-semibold">Preuves</h3>
        <div className="space-y-3">
          {proofs.length === 0 && <p className="text-slate-600">Aucune preuve enregistrée.</p>}
          {proofs.map((proof) => (
            <div key={proof.id} className="rounded-md border border-slate-100 p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium">{proof.description ?? 'Preuve fournie'}</p>
                <div className="flex items-center gap-2">
                  {(() => {
                    if (!proof.status) {
                      return <Badge variant="neutral">—</Badge>;
                    }
                    const badge = mapProofStatusToBadge(proof.status);
                    return <Badge variant={badge.variant}>{badge.label}</Badge>;
                  })()}
                  {proof.ai_checked_at &&
                    (() => {
                      const aiBadge = mapAiRiskToBadge(proof.ai_risk_level);
                      return <Badge variant={aiBadge.variant}>{aiBadge.label}</Badge>;
                    })()}
                </div>
              </div>
              <p className="text-xs text-slate-500">{formatOptionalDate(proof.created_at)}</p>
              {(() => {
                const attachmentLink = proof.attachment_url ?? proof.file_url;
                if (!attachmentLink) return null;
                return (
                  <a
                    href={attachmentLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-indigo-600 hover:underline"
                  >
                    Consulter la pièce jointe
                  </a>
                );
              })()}
              <div className="mt-2 space-y-2">
                <ProofAiStatus proof={proof} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-3 text-lg font-semibold">Paiements</h3>
        <div className="space-y-2">
          {payments.length === 0 && <p className="text-slate-600">Aucun paiement enregistré.</p>}
          {payments.map((payment) => (
            <div key={payment.id} className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2">
              <div>
                <p className="font-medium">{payment.amount ?? '—'} {payment.currency ?? ''}</p>
                <p className="text-xs text-slate-500">{formatOptionalDate(payment.created_at)}</p>
              </div>
              {(() => {
                if (!payment.status) {
                  return <Badge variant="neutral">—</Badge>;
                }
                const badge = mapPaymentStatusToBadge(payment.status);
                return <Badge variant={badge.variant}>{badge.label}</Badge>;
              })()}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
