'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { extractErrorMessage } from '@/lib/apiClient';
import { useAuthMe, useUpdateUserProfile, useUserProfile } from '@/lib/queries/sender';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { useToast } from '@/components/ui/ToastProvider';
import type { UserProfileUpdatePayload } from '@/types/api';

const INFO_MESSAGE =
  'Vos informations de profil sont importantes pour la vérification des transactions et la communication avec les séquestres. Merci de toujours les maintenir à jour.';

const SUPPORT_EMAIL = 'support@kobatela.com';

export default function SenderProfilePage() {
  const { data: authUser, isLoading: isAuthLoading, error: authError } = useAuthMe();
  const { data: profile, isLoading: isProfileLoading, error: profileError } = useUserProfile();
  const updateProfile = useUpdateUserProfile();
  const { showToast } = useToast();
  const [editAll, setEditAll] = useState(false);
  const [editPersonal, setEditPersonal] = useState(false);
  const [editContact, setEditContact] = useState(false);
  const [formState, setFormState] = useState({
    first_name: '',
    last_name: '',
    address_line1: '',
    address_line2: '',
    city: '',
    postal_code: '',
    country_code: '',
    email: '',
    phone: ''
  });

  const hydrateForm = useCallback((currentProfile: typeof profile) => {
    if (!currentProfile) return;
    setFormState({
      first_name: currentProfile.first_name ?? '',
      last_name: currentProfile.last_name ?? '',
      address_line1: currentProfile.address_line1 ?? '',
      address_line2: currentProfile.address_line2 ?? '',
      city: currentProfile.city ?? '',
      postal_code: currentProfile.postal_code ?? '',
      country_code: currentProfile.country_code ?? '',
      email: currentProfile.email ?? '',
      phone: currentProfile.phone ?? ''
    });
  }, []);

  useEffect(() => {
    hydrateForm(profile);
  }, [hydrateForm, profile]);

  const payload = useMemo<UserProfileUpdatePayload>(
    () => ({
      first_name: formState.first_name.trim() || undefined,
      last_name: formState.last_name.trim() || undefined,
      address_line1: formState.address_line1.trim() || undefined,
      address_line2: formState.address_line2.trim() || undefined,
      city: formState.city.trim() || undefined,
      postal_code: formState.postal_code.trim() || undefined,
      country_code: formState.country_code.trim()
        ? formState.country_code.trim().toUpperCase()
        : undefined,
      email: formState.email.trim() || undefined,
      phone: formState.phone.trim() || undefined
    }),
    [formState]
  );

  const isLoading = isAuthLoading || isProfileLoading;
  const error = authError ?? profileError;

  if (isLoading) {
    return <LoadingState label="Chargement de votre profil..." />;
  }

  if (error) {
    return <ErrorAlert message={extractErrorMessage(error)} />;
  }

  if (!authUser) {
    return null;
  }

  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
    authUser.full_name ||
    authUser.email ||
    '—';

  const roleLabel = authUser.role ? (authUser.role === 'user' ? 'Utilisateur' : authUser.role) : '—';

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const isPersonalEditing = editAll || editPersonal;
  const isContactEditing = editAll || editContact;

  const handleToggleAll = () => {
    setEditAll((prev) => {
      const next = !prev;
      if (!next) {
        setEditPersonal(false);
        setEditContact(false);
        hydrateForm(profile);
      }
      return next;
    });
  };

  const handleSectionCancel = (section: 'personal' | 'contact') => {
    if (!profile) return;
    if (section === 'personal') {
      setFormState((prev) => ({
        ...prev,
        first_name: profile.first_name ?? '',
        last_name: profile.last_name ?? '',
        address_line1: profile.address_line1 ?? '',
        address_line2: profile.address_line2 ?? '',
        city: profile.city ?? '',
        postal_code: profile.postal_code ?? '',
        country_code: profile.country_code ?? ''
      }));
      setEditPersonal(false);
    } else {
      setFormState((prev) => ({
        ...prev,
        email: profile.email ?? '',
        phone: profile.phone ?? ''
      }));
      setEditContact(false);
    }
  };

  const handleSave = (event: FormEvent, section: 'personal' | 'contact') => {
    event.preventDefault();
    const sectionPayload: UserProfileUpdatePayload =
      section === 'personal'
        ? {
            first_name: payload.first_name,
            last_name: payload.last_name,
            address_line1: payload.address_line1,
            address_line2: payload.address_line2,
            city: payload.city,
            postal_code: payload.postal_code,
            country_code: payload.country_code
          }
        : {
            email: payload.email,
            phone: payload.phone
          };

    updateProfile.mutate(sectionPayload, {
      onSuccess: () => {
        showToast('Profil mis à jour avec succès.', 'success');
        if (section === 'personal') {
          setEditPersonal(false);
        } else {
          setEditContact(false);
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Gestion de mon profil</h1>
      </div>

      <Card className="border-amber-100 bg-amber-50/60">
        <CardContent className="flex items-start gap-3 p-4 text-sm text-slate-700">
          <span className="text-2xl">💡</span>
          <p className="leading-relaxed">{INFO_MESSAGE}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-200 text-lg font-semibold text-slate-600">
              {initials || '—'}
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold text-slate-900">{displayName}</p>
              <p className="text-sm text-slate-600">{authUser.email ?? '—'}</p>
              <p className="text-sm text-slate-600">Rôle: {roleLabel}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleToggleAll}>
            {editAll ? 'Fermer' : 'Modifier'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Information personnelle</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditPersonal((prev) => !prev)}
          >
            {editPersonal ? 'Fermer' : 'Modifier'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {updateProfile.isError && (
            <ErrorAlert message={extractErrorMessage(updateProfile.error)} />
          )}
          <form onSubmit={(event) => handleSave(event, 'personal')} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Prénom"
                value={formState.first_name}
                placeholder="—"
                disabled={!isPersonalEditing}
                onChange={(value) => setFormState((prev) => ({ ...prev, first_name: value }))}
              />
              <Field
                label="Nom"
                value={formState.last_name}
                placeholder="—"
                disabled={!isPersonalEditing}
                onChange={(value) => setFormState((prev) => ({ ...prev, last_name: value }))}
              />
              <Field
                label="Adresse (ligne 1)"
                value={formState.address_line1}
                placeholder="—"
                disabled={!isPersonalEditing}
                onChange={(value) => setFormState((prev) => ({ ...prev, address_line1: value }))}
              />
              <Field
                label="Adresse (ligne 2)"
                value={formState.address_line2}
                placeholder="—"
                disabled={!isPersonalEditing}
                onChange={(value) => setFormState((prev) => ({ ...prev, address_line2: value }))}
              />
              <Field
                label="Ville"
                value={formState.city}
                placeholder="—"
                disabled={!isPersonalEditing}
                onChange={(value) => setFormState((prev) => ({ ...prev, city: value }))}
              />
              <Field
                label="Code postal"
                value={formState.postal_code}
                placeholder="—"
                disabled={!isPersonalEditing}
                onChange={(value) => setFormState((prev) => ({ ...prev, postal_code: value }))}
              />
              <Field
                label="Pays (code ISO-2)"
                value={formState.country_code}
                placeholder="—"
                disabled={!isPersonalEditing}
                maxLength={2}
                onChange={(value) => setFormState((prev) => ({ ...prev, country_code: value }))}
              />
            </div>
            {isPersonalEditing && (
              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={updateProfile.isPending}>
                  {updateProfile.isPending ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSectionCancel('personal')}
                  disabled={updateProfile.isPending}
                >
                  Annuler
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Coordonnées</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditContact((prev) => !prev)}
          >
            {editContact ? 'Fermer' : 'Modifier'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {updateProfile.isError && (
            <ErrorAlert message={extractErrorMessage(updateProfile.error)} />
          )}
          <form onSubmit={(event) => handleSave(event, 'contact')} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Email de contact"
                value={formState.email}
                placeholder="—"
                disabled={!isContactEditing}
                type="email"
                onChange={(value) => setFormState((prev) => ({ ...prev, email: value }))}
              />
              <Field
                label="Numéro de téléphone"
                value={formState.phone}
                placeholder="—"
                disabled={!isContactEditing}
                onChange={(value) => setFormState((prev) => ({ ...prev, phone: value }))}
              />
            </div>
            {isContactEditing && (
              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={updateProfile.isPending}>
                  {updateProfile.isPending ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSectionCancel('contact')}
                  disabled={updateProfile.isPending}
                >
                  Annuler
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sécurité</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600">
          <p>Pour toute question de sécurité du compte, contactez le support.</p>
          <a className="font-semibold text-indigo-600 hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>
            Besoin d'aide ? Contactez notre support
          </a>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled = false,
  maxLength
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  maxLength?: number;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-slate-700">{label}</label>
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        className={disabled ? 'bg-slate-50 text-slate-500' : ''}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
