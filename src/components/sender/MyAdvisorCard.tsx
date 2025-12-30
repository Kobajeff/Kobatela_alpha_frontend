'use client';

import Link from 'next/link';
import { useMyAdvisor } from '@/lib/queries/sender';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { extractErrorMessage } from '@/lib/apiClient';
import { EmptyState } from '@/components/common/EmptyState';
import { isNoAdvisorAvailable } from '@/lib/errors';
import type { AdvisorProfile } from '@/types/api';

export function AdvisorProfileCard({ advisor, showProfileLink = true }: { advisor: AdvisorProfile; showProfileLink?: boolean }) {
  const {
    first_name,
    last_name,
    email,
    phone,
    sender_managed,
    total_number_of_case_managed,
    subscribe_date,
    language,
    advisor_grade,
    short_description,
    country,
    is_active,
    blocked
  } = advisor;
  const fullName = `${first_name ?? ''} ${last_name ?? ''}`.trim();
  const displayName = fullName || email || advisor.advisor_id || 'Votre conseiller';

  return (
    <div className="flex flex-col justify-between rounded-md border bg-white p-4">
      <div>
        <p className="text-xs font-medium uppercase text-muted-foreground">Your dedicated advisor</p>
        <h3 className="mt-1 text-base font-semibold">{displayName}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{email ?? '—'}</p>

        <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
          <span
            className={`rounded-full px-2 py-1 font-semibold ${
              is_active ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'
            }`}
          >
            {is_active ? 'Actif' : 'Inactif'}
          </span>
          {blocked && <span className="rounded-full bg-red-50 px-2 py-1 font-semibold text-red-700">Bloqué</span>}
        </div>

        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
          <p>
            Managing senders: <span className="font-medium">{sender_managed}</span>
          </p>
          <p>
            Total cases handled: <span className="font-medium">{total_number_of_case_managed}</span>
          </p>
          <p>
            Assigned since: <span className="font-medium">{new Date(subscribe_date).toLocaleDateString()}</span>
          </p>
          {phone && <p>Téléphone : {phone}</p>}
          {country && <p>Pays : {country}</p>}
          {language && <p>Langue : {language}</p>}
          {advisor_grade && <p>Grade : {advisor_grade}</p>}
          {short_description && <p>Focus : {short_description}</p>}
        </div>
      </div>

      {showProfileLink && (
        <div className="mt-3 flex items-center justify-between text-xs">
          <p className="max-w-xs text-[11px] text-muted-foreground">
            Your advisor helps you review proofs, detect issues, and keep your project on track.
          </p>
          <Link href="/sender/advisor" className="text-xs font-semibold text-blue-600 hover:underline">
            View advisor profile
          </Link>
        </div>
      )}
    </div>
  );
}

export function MyAdvisorCard({ showProfileLink = true }: { showProfileLink?: boolean } = {}) {
  const { data, isLoading, isError, error } = useMyAdvisor();

  const noAdvisorAvailable = isNoAdvisorAvailable(error) || (!data && !isLoading && !isError);

  if (isLoading) {
    return <LoadingState label="Chargement de votre conseiller..." fullHeight={false} />;
  }

  if (isError && !isNoAdvisorAvailable(error)) {
    return <ErrorAlert message={extractErrorMessage(error)} />;
  }

  if (noAdvisorAvailable || !data) {
    return (
      <EmptyState message="No advisor is available yet. We will assign one to you as soon as possible." />
    );
  }

  return <AdvisorProfileCard advisor={data} showProfileLink={showProfileLink} />;
}
