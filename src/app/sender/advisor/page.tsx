'use client';

import Link from 'next/link';
import { useMyAdvisor } from '@/lib/queries/sender';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { extractErrorMessage, isForbiddenError } from '@/lib/apiClient';
import { isNoAdvisorAvailable } from '@/lib/errors';
import type { AdvisorProfile } from '@/types/api';

function safeDisplayName(advisor?: AdvisorProfile | null) {
  if (!advisor) {
    return 'Conseiller Kobatela';
  }
  const fullName = [advisor.first_name, advisor.last_name].filter(Boolean).join(' ').trim();
  return fullName || advisor.email || advisor.advisor_id || 'Conseiller Kobatela';
}

function getInitials(name: string) {
  const parts = name.split(' ').filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '');
  return initials.join('') || 'CK';
}

function renderStars(rating?: number | null) {
  const filled = rating ? Math.max(0, Math.min(5, Math.floor(rating))) : 0;
  const stars = '★★★★★'.slice(0, filled).padEnd(5, '☆');
  return stars;
}

export default function SenderAdvisorPage() {
  const { data: advisor, isLoading, isError, error } = useMyAdvisor();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-6">
        <LoadingState label="Chargement du conseiller..." fullHeight={false} />
      </div>
    );
  }

  if (isError && !isNoAdvisorAvailable(error)) {
    const message = isForbiddenError(error) ? 'Accès restreint.' : extractErrorMessage(error);
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-6">
        <ErrorAlert message={message} />
      </div>
    );
  }

  const noAdvisor = isNoAdvisorAvailable(error) || !advisor;
  const displayName = noAdvisor ? 'Aucun conseiller assigné' : safeDisplayName(advisor);
  const initials = getInitials(displayName);
  const rating = noAdvisor ? null : advisor?.advisor_review ?? null;
  const phone = noAdvisor ? null : advisor?.phone ?? null;
  const email = noAdvisor ? null : advisor?.email ?? null;

  return (
    <div className="min-h-screen bg-[#f8f5ff] px-4 py-6 text-slate-700">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-700">Mon conseiller</h1>
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white/80 p-4 text-sm text-slate-600 shadow-sm">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-lg">💡</span>
          <p>Vous bénéficiez d’un conseiller dédié pour un accompagnement personnalisé.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white/90 p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 text-2xl font-semibold text-slate-500">
                  {advisor?.profile_photo && !noAdvisor ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={advisor.profile_photo} alt={displayName} className="h-full w-full object-cover" />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-800">{displayName}</h2>
                    <p className="text-sm text-slate-500">Conseiller dédié Direct Pay</p>
                  </div>

                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">
                    <p className="flex flex-wrap items-center gap-2">
                      <span>Pays gérés : —</span>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                        Disponible bientôt
                      </span>
                    </p>
                    <p className="mt-2 flex flex-wrap items-center gap-2">
                      <span>
                        Note : {typeof rating === 'number' ? `${rating.toFixed(2)}/5` : '—'}
                      </span>
                      <span className="text-amber-400">{renderStars(rating)}</span>
                      {typeof rating !== 'number' && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                          Disponible bientôt
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white/90 p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-700">Informations de contact</h3>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-lg">📞</span>
                  <span>Téléphone : {phone ?? '—'}</span>
                  {!phone && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      Disponible bientôt
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-lg">✉️</span>
                  <span>Email : {email ?? '—'}</span>
                  {!email && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      Disponible bientôt
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white/90 p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-700">Demander une revue sur une preuve</h3>
              <p className="mt-2 text-sm text-slate-600">
                Votre conseiller dédié peut vous aider en examinant une preuve déposée.
              </p>
              <Link
                href="/sender/escrows"
                className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-slate-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Voir les preuves déposées et demander une revue →
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white/90 p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-700">Messagerie</h3>
            <div className="mt-3 space-y-3 rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">
              <p className="font-medium text-slate-700">La messagerie arrive bientôt.</p>
              <p>
                Vous pourrez très bientôt contacter votre conseiller directement via la messagerie sécurisée.
              </p>
            </div>
          </div>
        </div>

        <div className="text-center text-sm text-slate-500">
          Contactez notre support si vous avez besoin d’assistance supplémentaire.{' '}
          <a href="mailto:support@kobatela.com" className="font-semibold text-slate-600 hover:underline">
            support@kobatela.com
          </a>
        </div>
      </div>
    </div>
  );
}
