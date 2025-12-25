'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { LoadingState } from '@/components/common/LoadingState';
import { useAdvisorProfile } from '@/lib/queries/advisor';
import { useAuthMe } from '@/lib/queries/sender';

export default function AdvisorProfilePage() {
  const { data: profile, isLoading, isError, error } = useAdvisorProfile();
  const { data: authUser } = useAuthMe();

  if (isLoading) {
    return <LoadingState label="Chargement de votre profil conseiller..." />;
  }

  if (isError) {
    return <ErrorAlert message={error?.message ?? 'Erreur de chargement du profil'} />;
  }

  if (!profile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Advisor profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-slate-700">
          <p>Votre profil conseiller n&apos;est pas encore provisionné.</p>
          <p>
            Contactez un administrateur si vous pensez que c&apos;est une erreur. Adresse associée :{' '}
            <span className="font-semibold">{authUser?.email ?? 'N/A'}</span>.
          </p>
        </CardContent>
      </Card>
    );
  }

  const fullName = `${profile.first_name} ${profile.last_name}`.trim();
  const languages = profile.languages?.length ? profile.languages.join(', ') : '—';
  const specialties = profile.specialties?.length ? profile.specialties.join(', ') : '—';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Advisor profile</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <ProfileField label="Nom complet" value={fullName || '—'} />
        <ProfileField label="Email" value={profile.email} />
        <ProfileField label="Pays" value={profile.country ?? '—'} />
        <ProfileField label="Langues" value={languages} />
        <ProfileField label="Spécialités" value={specialties} />
        <ProfileField
          label="Preuves ouvertes gérées"
          value={profile.load_stats?.open_proofs?.toString() ?? '—'}
        />
        <ProfileField
          label="Clients actifs"
          value={profile.load_stats?.active_senders?.toString() ?? '—'}
        />
        <ProfileField label="Clients gérés" value={profile.sender_managed?.toString() ?? '—'} />
        <ProfileField
          label="Total des dossiers"
          value={profile.total_number_of_case_managed?.toString() ?? '—'}
        />
        <ProfileField label="Statut" value={profile.is_active ? 'Actif' : 'Inactif'} />
        <ProfileField label="Blocage" value={profile.blocked ? 'Bloqué' : 'Non bloqué'} />
      </CardContent>
    </Card>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1 rounded-md border border-slate-200 p-3">
      <div className="text-xs uppercase text-slate-500">{label}</div>
      <div className="text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}
