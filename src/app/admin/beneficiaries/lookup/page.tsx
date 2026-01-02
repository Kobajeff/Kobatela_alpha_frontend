'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { LoadingState } from '@/components/common/LoadingState';
import { isAdminBeneficiaryLookupEnabled } from '@/lib/featureFlags';
import { useAdminBeneficiaryProfile } from '@/lib/queries/admin';
import type { BeneficiaryProfileAdminRead } from '@/types/api';

function MinimalBeneficiaryView({ profile }: { profile: BeneficiaryProfileAdminRead }) {
  return (
    <div className="space-y-2 text-sm text-slate-800">
      <div>
        <span className="font-medium">ID:</span> <span className="font-mono">{profile.id}</span>
      </div>
      <div>
        <span className="font-medium">Nom complet:</span>{' '}
        {profile.full_name || `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() ||
          '—'}
      </div>
      <div>
        <span className="font-medium">Créé le:</span> {profile.created_at ?? '—'}
      </div>
      <div>
        <span className="font-medium">Mis à jour le:</span> {profile.updated_at ?? '—'}
      </div>
    </div>
  );
}

function SensitiveBeneficiaryDetails({ profile }: { profile: BeneficiaryProfileAdminRead }) {
  const sensitiveFields: Array<{ label: string; value: string | number | boolean | null | undefined }> = [
    { label: 'Email', value: profile.email },
    { label: 'Téléphone', value: profile.phone },
    { label: 'Adresse', value: profile.address_line1 },
    { label: 'Adresse (ligne 2)', value: profile.address_line2 },
    { label: 'Ville', value: profile.city },
    { label: 'Code postal', value: profile.postal_code },
    { label: 'Pays', value: profile.country_code },
    { label: 'IBAN', value: profile.iban },
    { label: 'Compte bancaire', value: profile.bank_account },
    { label: 'Numéro de compte', value: profile.bank_account_number },
    { label: 'Routing number', value: profile.bank_routing_number },
    { label: 'Mobile money', value: profile.mobile_money_number },
    { label: 'Opérateur mobile money', value: profile.mobile_money_provider },
    { label: 'Canal de paiement', value: profile.payout_channel },
    { label: 'Type de pièce', value: profile.national_id_type },
    { label: 'Numéro de pièce', value: profile.national_id_number },
    { label: 'Notes', value: profile.notes },
    { label: 'Metadata', value: profile.metadata ? JSON.stringify(profile.metadata) : null },
    { label: 'Actif', value: profile.is_active }
  ];

  return (
    <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800">
      <p className="text-xs text-slate-600">
        Détails sensibles visibles uniquement pour admin/support. Ne pas partager ou exporter.
      </p>
      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {sensitiveFields.map((field) => (
          <div key={field.label} className="space-y-1">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {field.label}
            </dt>
            <dd className="break-words rounded bg-white px-3 py-2 text-sm text-slate-800">
              {field.value === null || field.value === undefined || field.value === ''
                ? '—'
                : String(field.value)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function SensitiveSection({ profile }: { profile: BeneficiaryProfileAdminRead }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" type="button" onClick={() => setOpen((prev) => !prev)}>
          {open ? 'Masquer les détails sensibles' : 'Afficher les détails sensibles'}
        </Button>
        <p className="text-xs text-slate-600">
          Les champs sensibles sont visibles uniquement pour les rôles admin/support. Ne pas
          exporter ni partager.
        </p>
      </div>
      {open && <SensitiveBeneficiaryDetails profile={profile} />}
    </div>
  );
}

export default function BeneficiaryProfileLookupPage() {
  const [beneficiaryId, setBeneficiaryId] = useState('');
  const [submittedId, setSubmittedId] = useState('');
  const featureFlagEnabled = isAdminBeneficiaryLookupEnabled();

  const beneficiaryQuery = useAdminBeneficiaryProfile(submittedId, {
    enabled: featureFlagEnabled && Boolean(submittedId)
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmittedId(beneficiaryId.trim());
  };

  if (!featureFlagEnabled) {
    return (
      <Card>
        <CardContent className="space-y-2">
          <CardTitle>Disabled (feature flag off)</CardTitle>
          <p className="text-sm text-slate-600">
            La recherche de profil bénéficiaire est désactivée. Définissez NEXT_PUBLIC_FF_ADMIN_BENEFICIARY_LOOKUP="true" pour activer cette page.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-800">BeneficiaryProfile Lookup</h1>
        <p className="text-sm text-slate-600">
          Lecture seule, scopes admin/support. Saisissez un ID de BeneficiaryProfile pour lire le profil via GET /beneficiaries/{{id}}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rechercher un profil bénéficiaire</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800" htmlFor="beneficiary-id">
                BeneficiaryProfile ID
              </label>
              <Input
                id="beneficiary-id"
                value={beneficiaryId}
                onChange={(e) => setBeneficiaryId(e.target.value)}
                placeholder="Ex: 123 ou uuid"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={!beneficiaryId.trim() || beneficiaryQuery.isFetching}>
                Rechercher
              </Button>
              {beneficiaryQuery.isFetching && <LoadingState label="Chargement..." />}
            </div>
          </form>
        </CardContent>
      </Card>

      {beneficiaryQuery.isError && (
        <ErrorAlert message="Impossible de charger le profil bénéficiaire. Vérifiez l'ID et les droits (admin/support)." />
      )}

      {beneficiaryQuery.data && (
        <Card>
          <CardHeader>
            <CardTitle>Profil bénéficiaire</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <MinimalBeneficiaryView profile={beneficiaryQuery.data} />
            <SensitiveSection profile={beneficiaryQuery.data} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
