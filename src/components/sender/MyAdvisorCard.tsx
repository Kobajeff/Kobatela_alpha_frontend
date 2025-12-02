'use client';

import Link from 'next/link';
import { useMyAdvisor } from '@/lib/queries/sender';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { extractErrorMessage } from '@/lib/apiClient';

export function MyAdvisorCard() {
  const { data, isLoading, isError, error } = useMyAdvisor();

  if (isLoading) {
    return <LoadingState label="Chargement de votre conseiller..." fullHeight={false} />;
  }

  if (isError) {
    return <ErrorAlert message={extractErrorMessage(error)} />;
  }

  if (!data) {
    return (
      <div className="rounded-md border border-dashed bg-slate-50 p-4 text-sm text-muted-foreground">
        Aucun conseiller n’a encore été assigné à votre dossier. Vous serez notifié dès qu'un membre de l'équipe vous sera dédié.
      </div>
    );
  }

  const {
    first_name,
    last_name,
    email,
    sender_managed,
    total_number_of_case_managed,
    subscribe_date,
    languages,
    specialties,
    country,
    is_active,
    blocked
  } = data;

  return (
    <div className="flex flex-col justify-between rounded-md border bg-white p-4">
      <div>
        <p className="text-xs font-medium uppercase text-muted-foreground">
          Your dedicated advisor
        </p>
        <h3 className="mt-1 text-base font-semibold">
          {first_name} {last_name}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {email}
        </p>

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
          {country && <p>Pays : {country}</p>}
          {languages && languages.length > 0 && (
            <p>Languages: {languages.join(', ')}</p>
          )}
          {specialties && specialties.length > 0 && (
            <p>Focus: {specialties.join(', ')}</p>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        <p className="max-w-xs text-[11px] text-muted-foreground">
          Your advisor helps you review proofs, detect issues, and keep your project on track.
        </p>
        <Link
          href="/sender/advisor"
          className="text-xs font-semibold text-blue-600 hover:underline"
        >
          View advisor profile
        </Link>
      </div>
    </div>
  );
}
