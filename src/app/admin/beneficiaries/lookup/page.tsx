'use client';

import { useState } from 'react';
import { isAxiosError } from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/common/LoadingState';
import { opsBeneficiaryLookupEnabled } from '@/lib/featureFlags';
import { useAdminBeneficiaryProfile } from '@/lib/queries/admin';
import type { BeneficiaryProfileAdminRead } from '@/types/api';
import { SensitiveSection } from '@/components/admin/SensitiveSection';
import { MaskedValue } from '@/components/admin/MaskedValue';
import { OpsErrorState } from '@/components/admin/OpsErrorState';

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
  return (
    <div className="space-y-2 text-sm text-slate-800">
      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Detail label="Email">
          <MaskedValue value={profile.email} mode="email" />
        </Detail>
        <Detail label="Téléphone">
          <MaskedValue value={profile.phone} mode="phone" />
        </Detail>
        <Detail label="Adresse">
          <MaskedValue value={profile.address_line1} mode="last4" />
        </Detail>
        <Detail label="Adresse (ligne 2)">
          <MaskedValue value={profile.address_line2} mode="last4" />
        </Detail>
        <Detail label="Ville">
          <MaskedValue value={profile.city} mode="last4" />
        </Detail>
        <Detail label="Code postal">
          <MaskedValue value={profile.postal_code} mode="last4" />
        </Detail>
        <Detail label="Pays">
          <MaskedValue value={profile.country_code} mode="last4" />
        </Detail>
        <Detail label="IBAN">
          <MaskedValue value={profile.iban} mode="iban" />
        </Detail>
        <Detail label="Compte bancaire">
          <MaskedValue value={profile.bank_account} mode="account" />
        </Detail>
        <Detail label="Numéro de compte">
          <MaskedValue value={profile.bank_account_number} mode="account" />
        </Detail>
        <Detail label="Routing number">
          <MaskedValue value={profile.bank_routing_number} mode="account" />
        </Detail>
        <Detail label="Mobile money">
          <MaskedValue value={profile.mobile_money_number} mode="phone" />
        </Detail>
        <Detail label="Opérateur mobile money">
          <MaskedValue value={profile.mobile_money_provider} mode="last4" />
        </Detail>
        <Detail label="Canal de paiement">
          <MaskedValue value={profile.payout_channel} mode="last4" />
        </Detail>
        <Detail label="Type de pièce">
          <MaskedValue value={profile.national_id_type} mode="last4" />
        </Detail>
        <Detail label="Numéro de pièce">
          <MaskedValue value={profile.national_id_number} mode="account" />
        </Detail>
        <Detail label="Notes">
          <MaskedValue value={profile.notes} mode="last4" />
        </Detail>
        <Detail label="Metadata">{profile.metadata ? 'Présent (masqué)' : '—'}</Detail>
        <Detail label="Actif">{profile.is_active ? 'Oui' : 'Non'}</Detail>
      </dl>
    </div>
  );
}

function Detail({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="break-words rounded bg-white px-3 py-2 text-sm text-slate-800">{children}</dd>
    </div>
  );
}

export default function BeneficiaryProfileLookupPage() {
  const [beneficiaryId, setBeneficiaryId] = useState('');
  const [submittedId, setSubmittedId] = useState('');
  const featureFlagEnabled = opsBeneficiaryLookupEnabled();

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
          Lecture seule, scopes admin/support. Saisissez un ID de BeneficiaryProfile pour lire le profil via GET /beneficiaries/
          {'{id}'}.
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
        <OpsErrorState
          error={beneficiaryQuery.error}
          statusCode={isAxiosError(beneficiaryQuery.error) ? beneficiaryQuery.error.response?.status : undefined}
          onRetry={() => beneficiaryQuery.refetch()}
          fallbackMessage="Impossible de charger le profil bénéficiaire. Vérifiez l'ID et les droits (admin/support)."
        />
      )}

      {beneficiaryQuery.data && (
        <Card>
          <CardHeader>
            <CardTitle>Profil bénéficiaire</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <MinimalBeneficiaryView profile={beneficiaryQuery.data} />
            <SensitiveSection title="détails sensibles" defaultCollapsed>
              <SensitiveBeneficiaryDetails profile={beneficiaryQuery.data} />
            </SensitiveSection>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
