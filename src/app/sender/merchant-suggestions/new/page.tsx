'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { useCreateMerchantSuggestion } from '@/lib/queries/sender';
import { Input } from '@/components/ui/Input';
import { extractErrorMessage } from '@/lib/apiClient';
import { useToast } from '@/components/ui/ToastProvider';
import type { MerchantSuggestionCreatePayload } from '@/types/api';

type FieldErrors = Record<string, string>;

const extractFieldErrors = (error: unknown): FieldErrors => {
  const errorPayload = (error as { response?: { data?: any } })?.response?.data;
  const fieldErrors =
    errorPayload?.error?.field_errors ??
    errorPayload?.error?.details?.field_errors ??
    errorPayload?.detail?.field_errors ??
    errorPayload?.field_errors;

  if (!fieldErrors || typeof fieldErrors !== 'object') return {};

  return Object.entries(fieldErrors).reduce<FieldErrors>((acc, [key, value]) => {
    if (Array.isArray(value)) {
      acc[key] = value.filter(Boolean).join(', ');
    } else if (typeof value === 'string') {
      acc[key] = value;
    }
    return acc;
  }, {});
};

const normalizeIban = (value: string) => value.replace(/\s+/g, '').toUpperCase();

const parsePositiveInt = (value: string | null) => {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const isValidCountryCode = (value: string) => /^[A-Z]{2}$/.test(value);
const isValidIban = (value: string) => /^[A-Z0-9]{15,34}$/.test(value);
const isValidUrl = (value: string) => /^https?:\/\//i.test(value);
const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export default function NewMerchantSuggestionPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [formState, setFormState] = useState({
    name: '',
    country_code: '',
    description: '',
    iban: '',
    phone: '',
    website_url: '',
    vat_number: '',
    address_line1: '',
    address_city: '',
    category: '',
    contact_email: '',
    address_line2: ''
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const { mutate, isPending, error, reset } = useCreateMerchantSuggestion();

  const [escrowId, setEscrowId] = useState<number | null>(null);
  const [mandateId, setMandateId] = useState<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEscrowId(parsePositiveInt(params.get('escrowId')));
    setMandateId(parsePositiveInt(params.get('mandateId')));
  }, []);

  const descriptionLength = formState.description.length;

  const isFormValid = useMemo(() => {
    const name = formState.name.trim();
    const countryCode = formState.country_code.trim().toUpperCase();
    const description = formState.description.trim();
    const iban = normalizeIban(formState.iban);
    const phone = formState.phone.trim();
    const addressLine1 = formState.address_line1.trim();
    const addressCity = formState.address_city.trim();

    if (name.length < 2) return false;
    if (!isValidCountryCode(countryCode)) return false;
    if (description.length < 20 || description.length > 2000) return false;
    if (!isValidIban(iban)) return false;
    if (phone.length < 4) return false;
    if (addressLine1.length < 2) return false;
    if (addressCity.length < 2) return false;

    if (formState.website_url.trim() && !isValidUrl(formState.website_url.trim())) return false;
    if (formState.contact_email.trim() && !isValidEmail(formState.contact_email.trim())) return false;

    return true;
  }, [formState]);

  const getFieldError = (...keys: string[]) => keys.map((key) => fieldErrors[key]).find(Boolean);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    reset();
    setFieldErrors({});

    const nextErrors: FieldErrors = {};

    const name = formState.name.trim();
    const countryCode = formState.country_code.trim().toUpperCase();
    const description = formState.description.trim();
    const iban = normalizeIban(formState.iban);
    const phone = formState.phone.trim();
    const addressLine1 = formState.address_line1.trim();
    const addressCity = formState.address_city.trim();
    const websiteUrl = formState.website_url.trim();
    const contactEmail = formState.contact_email.trim();

    if (name.length < 2) nextErrors.name = 'Le nom doit contenir au moins 2 caractères.';
    if (!isValidCountryCode(countryCode)) nextErrors.country_code = 'Le code pays doit contenir 2 lettres.';
    if (description.length < 20 || description.length > 2000) {
      nextErrors.description = 'La description doit contenir entre 20 et 2 000 caractères.';
    }
    if (!isValidIban(iban)) nextErrors.iban = 'L\'IBAN doit contenir entre 15 et 34 caractères alphanumériques.';
    if (phone.length < 4) nextErrors['contact.phone'] = 'Le téléphone doit contenir au moins 4 caractères.';
    if (addressLine1.length < 2) nextErrors['address.line1'] = 'L\'adresse doit contenir au moins 2 caractères.';
    if (addressCity.length < 2) nextErrors['address.city'] = 'La ville doit contenir au moins 2 caractères.';

    if (websiteUrl && !isValidUrl(websiteUrl)) {
      nextErrors.website_url = 'Le site web doit commencer par http:// ou https://';
    }

    if (contactEmail && !isValidEmail(contactEmail)) {
      nextErrors['contact.email'] = 'Veuillez renseigner un email valide.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    const payload: MerchantSuggestionCreatePayload = {
      name,
      country_code: countryCode,
      description,
      iban,
      contact: {
        phone,
        ...(contactEmail ? { email: contactEmail } : {})
      },
      address: {
        line1: addressLine1,
        ...(formState.address_line2.trim() ? { line2: formState.address_line2.trim() } : {}),
        city: addressCity
      },
      ...(websiteUrl ? { website_url: websiteUrl } : {}),
      ...(formState.category.trim() ? { category: formState.category.trim() } : {}),
      ...(formState.vat_number.trim() ? { vat_number: formState.vat_number.trim() } : {})
    };

    if (mandateId) {
      payload.mandate_id = mandateId;
    }

    if (escrowId) {
      payload.escrow_id = escrowId;
    }

    mutate(payload, {
      onSuccess: (data) => {
        if (data?.id) {
          router.push(`/sender/merchant-suggestions/${data.id}`);
          return;
        }
        showToast('Suggestion envoyée. Retrouvez-la dans la liste des marchands.', 'success');
        router.push('/sender/merchant-suggestions');
      },
      onError: (err) => {
        setFieldErrors(extractFieldErrors(err));
      }
    });
  };

  const errorMessage = error ? extractErrorMessage(error) : null;
  const backHref = (escrowId
    ? `/sender/escrows/${escrowId}/direct-pay/merchant`
    : '/sender/merchant-suggestions') as Route;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">Proposer un marchand</h1>
          {escrowId ? (
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              Lié à l&apos;escrow #{escrowId}
            </span>
          ) : null}
        </div>
        <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="flex items-start gap-3">
            <span className="text-lg">💡</span>
            <p>
              Remplissez le formulaire suivant pour proposer l&apos;intégration d&apos;un prestataire ou d&apos;un marchand
              sur notre plateforme.
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-6 p-6">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                Nom du prestataire ou marchand <span className="text-rose-500">*</span>
                <Input
                  className="mt-2"
                  value={formState.name}
                  onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Nom de l’entreprise / prestataire"
                />
                {getFieldError('name') ? (
                  <span className="text-xs text-rose-600">{getFieldError('name')}</span>
                ) : null}
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Pays <span className="text-rose-500">*</span>
                <Input
                  className="mt-2"
                  value={formState.country_code}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, country_code: event.target.value.toUpperCase() }))
                  }
                  placeholder="FR"
                  maxLength={2}
                />
                {getFieldError('country_code') ? (
                  <span className="text-xs text-rose-600">{getFieldError('country_code')}</span>
                ) : null}
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Description <span className="text-rose-500">*</span>
                <textarea
                  className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  rows={4}
                  maxLength={2000}
                  value={formState.description}
                  onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="Décrivez le prestataire ou marchand et pourquoi vous le recommandez"
                />
                <div className="flex items-center justify-between text-xs text-slate-500">
                  {getFieldError('description') ? (
                    <span className="text-rose-600">{getFieldError('description')}</span>
                  ) : (
                    <span>Minimum 20 caractères.</span>
                  )}
                  <span>
                    {descriptionLength.toLocaleString('fr-FR')} / 2 000
                  </span>
                </div>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-4">
                <label className="block text-sm font-medium text-slate-700">
                  IBAN <span className="text-rose-500">*</span>
                  <div className="relative mt-2">
                    <Input
                      value={formState.iban}
                      onChange={(event) => setFormState((prev) => ({ ...prev, iban: event.target.value }))}
                      onBlur={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          iban: normalizeIban(event.target.value)
                        }))
                      }
                      placeholder="Entrez l'IBAN du prestataire"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      ⓘ
                    </span>
                  </div>
                  {getFieldError('iban') ? (
                    <span className="text-xs text-rose-600">{getFieldError('iban')}</span>
                  ) : null}
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Coordonnées — Téléphone <span className="text-rose-500">*</span>
                  <Input
                    className="mt-2"
                    value={formState.phone}
                    onChange={(event) => setFormState((prev) => ({ ...prev, phone: event.target.value }))}
                    placeholder="+33 6 12 34 56 78"
                  />
                  {getFieldError('contact.phone', 'phone') ? (
                    <span className="text-xs text-rose-600">{getFieldError('contact.phone', 'phone')}</span>
                  ) : null}
                </label>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-medium text-slate-700">
                  Site web
                  <Input
                    className="mt-2"
                    value={formState.website_url}
                    onChange={(event) => setFormState((prev) => ({ ...prev, website_url: event.target.value }))}
                    placeholder="https://example.com"
                  />
                  {getFieldError('website_url') ? (
                    <span className="text-xs text-rose-600">{getFieldError('website_url')}</span>
                  ) : null}
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Numéro de TVA (optionnel)
                  <Input
                    className="mt-2"
                    value={formState.vat_number}
                    onChange={(event) => setFormState((prev) => ({ ...prev, vat_number: event.target.value }))}
                    placeholder="Numéro de TVA du prestataire"
                  />
                  {getFieldError('vat_number', 'tax_id') ? (
                    <span className="text-xs text-rose-600">{getFieldError('vat_number', 'tax_id')}</span>
                  ) : null}
                </label>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Adresse <span className="text-rose-500">*</span>
                <Input
                  className="mt-2"
                  value={formState.address_line1}
                  onChange={(event) => setFormState((prev) => ({ ...prev, address_line1: event.target.value }))}
                  placeholder="Numéro et rue"
                />
                {getFieldError('address.line1') ? (
                  <span className="text-xs text-rose-600">{getFieldError('address.line1')}</span>
                ) : null}
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Ville <span className="text-rose-500">*</span>
                <Input
                  className="mt-2"
                  value={formState.address_city}
                  onChange={(event) => setFormState((prev) => ({ ...prev, address_city: event.target.value }))}
                  placeholder="Ville"
                />
                {getFieldError('address.city') ? (
                  <span className="text-xs text-rose-600">{getFieldError('address.city')}</span>
                ) : null}
              </label>
            </div>

            <details className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
              <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                Champs optionnels
              </summary>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  Catégorie (optionnel)
                  <Input
                    className="mt-2"
                    value={formState.category}
                    onChange={(event) => setFormState((prev) => ({ ...prev, category: event.target.value }))}
                    placeholder="Ex : Services IT"
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Email (optionnel)
                  <Input
                    className="mt-2"
                    value={formState.contact_email}
                    onChange={(event) => setFormState((prev) => ({ ...prev, contact_email: event.target.value }))}
                    placeholder="contact@prestataire.com"
                    type="email"
                  />
                  {getFieldError('contact.email') ? (
                    <span className="text-xs text-rose-600">{getFieldError('contact.email')}</span>
                  ) : null}
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Complément d&apos;adresse (optionnel)
                  <Input
                    className="mt-2"
                    value={formState.address_line2}
                    onChange={(event) => setFormState((prev) => ({ ...prev, address_line2: event.target.value }))}
                    placeholder="Bâtiment, étage, appartement"
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Métadonnées (optionnel)
                  <Input
                    className="mt-2"
                    value="Disponible bientôt"
                    disabled
                  />
                </label>
              </div>
            </details>

            <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <div className="flex items-start gap-3">
                <span className="text-lg">ℹ️</span>
                <p>Note: Toutes les propositions seront examinées soigneusement par notre équipe avant approbation.</p>
              </div>
            </div>

            {errorMessage && <ErrorAlert message={errorMessage} />}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button type="button" variant="outline" onClick={() => router.push(backHref)}>
                ← Annuler
              </Button>
              <Button type="submit" disabled={isPending || !isFormValid}>
                {isPending ? 'Soumission...' : 'Soumettre la proposition'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-slate-500">
        Besoin d&apos;aide ?{' '}
        <Link className="font-medium text-indigo-600 hover:text-indigo-500" href="mailto:support@kobatela.com">
          Contactez notre support
        </Link>
      </div>
    </div>
  );
}
