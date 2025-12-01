'use client';

// Admin view of a single escrow, showing milestones, proofs, and payments.
import { useParams } from 'next/navigation';
import { extractErrorMessage } from '@/lib/apiClient';
import { useAdminEscrowSummary } from '@/lib/queries/admin';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatDateTime } from '@/lib/format';

export default function AdminEscrowDetailPage() {
  const params = useParams<{ id: string }>();
  const escrowId = params?.id ?? '';
  const query = useAdminEscrowSummary(escrowId);

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
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Escrow {data.escrow.id}</h2>
            <div className="mt-1 flex items-center gap-2 text-sm text-slate-600">
              <span>Statut :</span>
              <StatusBadge type="escrow" status={data.escrow.status} />
            </div>
          </div>
          <p className="text-sm text-slate-500">Créé le {formatDateTime(data.escrow.created_at)}</p>
        </div>
        <p className="mt-2 text-slate-700">
          Montant : {data.escrow.amount} {data.escrow.currency}
        </p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-3 text-lg font-semibold">Jalons</h3>
        <div className="space-y-2">
          {data.milestones.map((milestone) => (
            <div key={milestone.id} className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2">
              <div>
                <p className="font-medium">{milestone.name}</p>
                <p className="text-xs text-slate-500">Échéance : {milestone.due_date ?? 'N/A'}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{milestone.status}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-3 text-lg font-semibold">Preuves</h3>
        <div className="space-y-3">
          {data.proofs.length === 0 && <p className="text-slate-600">Aucune preuve enregistrée.</p>}
          {data.proofs.map((proof) => (
            <div key={proof.id} className="rounded-md border border-slate-100 p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium">{proof.description ?? 'Preuve fournie'}</p>
                <StatusBadge type="proof" status={proof.status} />
              </div>
              <p className="text-xs text-slate-500">{formatDateTime(proof.created_at)}</p>
              {(() => {
                const attachmentLink = proof.attachment_url ?? proof.storage_url;
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
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-3 text-lg font-semibold">Paiements</h3>
        <div className="space-y-2">
          {data.payments.length === 0 && <p className="text-slate-600">Aucun paiement enregistré.</p>}
          {data.payments.map((payment) => (
            <div key={payment.id} className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2">
              <div>
                <p className="font-medium">{payment.amount} {payment.currency}</p>
                <p className="text-xs text-slate-500">{formatDateTime(payment.created_at)}</p>
              </div>
              <StatusBadge type="payment" status={payment.status} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
