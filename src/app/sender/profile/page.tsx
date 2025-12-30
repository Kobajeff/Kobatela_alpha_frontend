'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { extractErrorMessage } from '@/lib/apiClient';
import { useAuthMe, useUpdateUserProfile, useUserProfile } from '@/lib/queries/sender';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import type { NationalIdType } from '@/types/api';

export default function SenderProfilePage() {
  const { data: authUser, isLoading: isAuthLoading, error: authError } = useAuthMe();
  const { data: profile, isLoading: isProfileLoading, error: profileError } = useUserProfile();
  const updateProfile = useUpdateUserProfile();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    postal_code: '',
    country_code: '',
    bank_account: '',
    national_id_type: '' as NationalIdType | '',
    national_id_number: '',
    spoken_languages: '',
    residence_region: '',
    habitual_send_region: ''
  });

  useEffect(() => {
    if (!profile) return;
    setFormState({
      first_name: profile.first_name ?? '',
      last_name: profile.last_name ?? '',
      email: profile.email ?? '',
      phone: profile.phone ?? '',
      address_line1: profile.address_line1 ?? '',
      address_line2: profile.address_line2 ?? '',
      city: profile.city ?? '',
      postal_code: profile.postal_code ?? '',
      country_code: profile.country_code ?? '',
      bank_account: profile.bank_account ?? '',
      national_id_type: profile.national_id_type ?? '',
      national_id_number: profile.national_id_number ?? '',
      spoken_languages: profile.spoken_languages?.join(', ') ?? '',
      residence_region: profile.residence_region ?? '',
      habitual_send_region: profile.habitual_send_region ?? ''
    });
  }, [profile]);

  const optionalFields = useMemo(
    () => ({
      first_name: formState.first_name.trim() || undefined,
      last_name: formState.last_name.trim() || undefined,
      email: formState.email.trim() || undefined,
      phone: formState.phone.trim() || undefined,
      address_line1: formState.address_line1.trim() || undefined,
      address_line2: formState.address_line2.trim() || undefined,
      city: formState.city.trim() || undefined,
      postal_code: formState.postal_code.trim() || undefined,
      country_code: formState.country_code.trim() ? formState.country_code.trim().toUpperCase() : undefined,
      bank_account: formState.bank_account.trim() || undefined,
      national_id_type: formState.national_id_type || undefined,
      national_id_number: formState.national_id_number.trim() || undefined,
      spoken_languages: formState.spoken_languages.trim()
        ? formState.spoken_languages.split(',').map((lang) => lang.trim()).filter(Boolean)
        : undefined,
      residence_region: formState.residence_region.trim() || undefined,
      habitual_send_region: formState.habitual_send_region.trim() || undefined
    }),
    [formState]
  );

  const isLoading = isAuthLoading || isProfileLoading;
  const error = authError ?? profileError;

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          Chargement de votre profil...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {extractErrorMessage(error)}
      </div>
    );
  }

  if (!authUser) {
    return null;
  }

  const scopeLabel =
    authUser.scopeList && authUser.scopeList.length > 0
      ? authUser.scopeList.join(', ')
      : 'Non disponible (MVP)';

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSuccessMessage(null);
    updateProfile.mutate(optionalFields, {
      onSuccess: () => {
        setSuccessMessage('Profil mis à jour avec succès.');
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Mon profil</h1>
        <p className="text-sm text-slate-600">Gérez vos informations de compte.</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-slate-600">Identifiant</dt>
            <dd className="text-base font-semibold text-slate-900">
              {authUser.userId ?? authUser.id ?? 'Non disponible (MVP)'}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-600">Email</dt>
            <dd className="text-base font-semibold text-slate-900">{authUser.email ?? 'N/A'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-600">Nom d'utilisateur</dt>
            <dd className="text-base font-semibold text-slate-900">{authUser.username ?? 'N/A'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-600">Rôle</dt>
            <dd className="text-base font-semibold capitalize text-slate-900">{authUser.role}</dd>
          </div>
          {authUser.payout_channel ? (
            <div>
              <dt className="text-sm font-medium text-slate-600">Canal de paiement</dt>
              <dd className="text-base font-semibold text-slate-900">{authUser.payout_channel}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-sm font-medium text-slate-600">Scopes</dt>
            <dd className="text-base font-semibold text-slate-900">{scopeLabel}</dd>
          </div>
        </dl>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profil utilisateur</CardTitle>
          <p className="text-sm text-slate-600">
            Ces informations alimentent le profil utilisateur /me/profile. Tous les champs sont
            optionnels selon le contrat backend.
          </p>
        </CardHeader>
        <CardContent>
          {successMessage && (
            <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {successMessage}
            </div>
          )}
          {updateProfile.isError && (
            <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {extractErrorMessage(updateProfile.error)}
            </div>
          )}
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <InputField
              label="Prénom"
              value={formState.first_name}
              onChange={(value) => setFormState((prev) => ({ ...prev, first_name: value }))}
            />
            <InputField
              label="Nom"
              value={formState.last_name}
              onChange={(value) => setFormState((prev) => ({ ...prev, last_name: value }))}
            />
            <InputField
              label="Email de contact"
              type="email"
              value={formState.email}
              onChange={(value) => setFormState((prev) => ({ ...prev, email: value }))}
            />
            <InputField
              label="Téléphone"
              value={formState.phone}
              onChange={(value) => setFormState((prev) => ({ ...prev, phone: value }))}
            />
            <InputField
              label="Adresse ligne 1"
              value={formState.address_line1}
              onChange={(value) => setFormState((prev) => ({ ...prev, address_line1: value }))}
            />
            <InputField
              label="Adresse ligne 2"
              value={formState.address_line2}
              onChange={(value) => setFormState((prev) => ({ ...prev, address_line2: value }))}
            />
            <InputField
              label="Ville"
              value={formState.city}
              onChange={(value) => setFormState((prev) => ({ ...prev, city: value }))}
            />
            <InputField
              label="Code postal"
              value={formState.postal_code}
              onChange={(value) => setFormState((prev) => ({ ...prev, postal_code: value }))}
            />
            <InputField
              label="Pays (code ISO-2)"
              value={formState.country_code}
              onChange={(value) => setFormState((prev) => ({ ...prev, country_code: value }))}
              maxLength={2}
            />
            <InputField
              label="Compte bancaire"
              value={formState.bank_account}
              onChange={(value) => setFormState((prev) => ({ ...prev, bank_account: value }))}
            />
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Type de pièce d'identité</label>
              <select
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                value={formState.national_id_type}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    national_id_type: event.target.value as NationalIdType | ''
                  }))
                }
              >
                <option value="">—</option>
                <option value="ID_CARD">Carte d'identité</option>
                <option value="PASSPORT">Passeport</option>
              </select>
            </div>
            <InputField
              label="Numéro de pièce d'identité"
              value={formState.national_id_number}
              onChange={(value) => setFormState((prev) => ({ ...prev, national_id_number: value }))}
            />
            <InputField
              label="Langues parlées (séparées par des virgules)"
              value={formState.spoken_languages}
              onChange={(value) => setFormState((prev) => ({ ...prev, spoken_languages: value }))}
            />
            <InputField
              label="Région de résidence"
              value={formState.residence_region}
              onChange={(value) => setFormState((prev) => ({ ...prev, residence_region: value }))}
            />
            <InputField
              label="Région d'envoi habituelle"
              value={formState.habitual_send_region}
              onChange={(value) => setFormState((prev) => ({ ...prev, habitual_send_region: value }))}
            />
            <div className="md:col-span-2">
              <Button type="submit" disabled={updateProfile.isPending}>
                {updateProfile.isPending ? 'Mise à jour...' : 'Mettre à jour le profil'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = 'text',
  maxLength
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  maxLength?: number;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-slate-700">{label}</label>
      <Input type={type} value={value} maxLength={maxLength} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
