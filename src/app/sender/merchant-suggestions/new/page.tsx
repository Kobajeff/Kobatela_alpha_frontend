'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { useCreateMerchantSuggestion } from '@/lib/queries/sender';
import { Input } from '@/components/ui/Input';
import { extractErrorMessage } from '@/lib/apiClient';
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

export default function NewMerchantSuggestionPage() {
  const router = useRouter();
  const [formState, setFormState] = useState({
    name: '',
    country_code: '',
    mandate_id: '',
    escrow_id: ''
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showSuccess, setShowSuccess] = useState(false);

  const { mutate, isPending, error, reset } = useCreateMerchantSuggestion();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShowSuccess(false);
    reset();
    setFieldErrors({});

    if (!formState.name.trim() || !formState.country_code.trim()) {
      setFieldErrors({
        name: !formState.name.trim() ? 'Le nom est requis.' : '',
        country_code: !formState.country_code.trim() ? 'Le pays est requis.' : ''
      });
      return;
    }

    const payload: MerchantSuggestionCreatePayload = {
      name: formState.name.trim(),
      country_code: formState.country_code.trim().toUpperCase()
    };

    const mandateId = Number(formState.mandate_id);
    if (!Number.isNaN(mandateId) && formState.mandate_id !== '') {
      payload.mandate_id = mandateId;
    }

    const escrowId = Number(formState.escrow_id);
    if (!Number.isNaN(escrowId) && formState.escrow_id !== '') {
      payload.escrow_id = escrowId;
    }

    mutate(payload, {
      onSuccess: (data) => {
        setShowSuccess(true);
        if (data?.id) {
          router.push(`/sender/merchant-suggestions/${data.id}`);
        } else {
          router.push('/sender/merchant-suggestions');
        }
      },
      onError: (err) => {
        setFieldErrors(extractFieldErrors(err));
      }
    });
  };

  const errorMessage = error ? extractErrorMessage(error) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Proposer un marchand</h1>
          <p className="text-sm text-slate-600">
            Vous pouvez suggérer un prestataire ou un marchand à intégrer dans notre plateforme.
          </p>
        </div>
        <Link href="/sender/merchant-suggestions">
          <Button variant="outline">Retour à la liste</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations du marchand</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Nom du marchand
                <Input
                  className="mt-2"
                  value={formState.name}
                  onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Exemple : Sample Merchant"
                />
                {fieldErrors.name && <span className="text-xs text-rose-600">{fieldErrors.name}</span>}
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Code pays
                <Input
                  className="mt-2"
                  value={formState.country_code}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, country_code: event.target.value.toUpperCase() }))
                  }
                  placeholder="FR"
                  maxLength={2}
                />
                {fieldErrors.country_code && <span className="text-xs text-rose-600">{fieldErrors.country_code}</span>}
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Mandate ID (optionnel)
                <Input
                  className="mt-2"
                  value={formState.mandate_id}
                  onChange={(event) => setFormState((prev) => ({ ...prev, mandate_id: event.target.value }))}
                  placeholder="Exemple : 123"
                  inputMode="numeric"
                />
                {fieldErrors.mandate_id && <span className="text-xs text-rose-600">{fieldErrors.mandate_id}</span>}
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Escrow ID (optionnel)
                <Input
                  className="mt-2"
                  value={formState.escrow_id}
                  onChange={(event) => setFormState((prev) => ({ ...prev, escrow_id: event.target.value }))}
                  placeholder="Exemple : 456"
                  inputMode="numeric"
                />
                {fieldErrors.escrow_id && <span className="text-xs text-rose-600">{fieldErrors.escrow_id}</span>}
              </label>
            </div>

            {errorMessage && <ErrorAlert message={errorMessage} />}

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Envoi...' : 'Proposer le marchand'}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => {
                  setFormState({
                    name: '',
                    country_code: '',
                    mandate_id: '',
                    escrow_id: ''
                  });
                  setFieldErrors({});
                  setShowSuccess(false);
                  reset();
                }}
              >
                Réinitialiser
              </Button>
            </div>

            {showSuccess && (
              <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                Suggestion créée avec succès. Vous serez redirigé vers le détail si un identifiant est retourné.
              </div>
            )}
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
