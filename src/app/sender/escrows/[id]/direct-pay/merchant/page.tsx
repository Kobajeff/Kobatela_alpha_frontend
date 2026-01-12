'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { extractErrorMessage } from '@/lib/apiClient';
import {
  useMerchantRegistryList,
  useMerchantSuggestionsList,
  useSenderEscrowSummary
} from '@/lib/queries/sender';

const FINALIZE_TOOLTIP =
  'La sélection du marchand pour Direct Pay sera disponible prochainement.';

export default function DirectPayMerchantChoicePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const escrowId = params?.id ?? '';

  const summaryQuery = useSenderEscrowSummary(escrowId);
  const suggestionsQuery = useMerchantSuggestionsList();
  const merchantRegistryQuery = useMerchantRegistryList({ limit: 50 });

  const [selectedOption, setSelectedOption] = useState<'certified' | 'my_merchants'>('certified');
  const [selectedMerchantId, setSelectedMerchantId] = useState<string | null>(null);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);

  const approvedSuggestions = useMemo(() => {
    return (suggestionsQuery.data ?? []).filter((suggestion) => suggestion.status === 'APPROVED');
  }, [suggestionsQuery.data]);

  if (summaryQuery.isLoading) {
    return <LoadingState label="Chargement de l'escrow..." />;
  }

  if (summaryQuery.isError) {
    return (
      <div className="p-4">
        <ErrorAlert message={extractErrorMessage(summaryQuery.error)} />
      </div>
    );
  }

  const summary = summaryQuery.data;
  if (!summary) {
    return null;
  }

  const escrow = summary.escrow;
  const amountLabel = escrow.amount_total
    ? `${escrow.amount_total} ${escrow.currency ?? ''}`.trim()
    : null;
  const registryItems = merchantRegistryQuery.data?.items ?? [];
  const certifiedMerchantsDisabled =
    merchantRegistryQuery.isLoading || merchantRegistryQuery.isError || registryItems.length === 0;
  const myMerchantsDisabled = suggestionsQuery.isLoading || approvedSuggestions.length === 0;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Escrow Direct Pay : Choix Marchand</h1>
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Finalisez votre escrow en choisissant un marchand certifié ou en proposant un nouveau
          prestataire.
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Résumé escrow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-slate-700">
            {amountLabel ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">Montant :</span>
                <span>{amountLabel}</span>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Marchand</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                type="radio"
                name="merchant-option"
                checked={selectedOption === 'certified'}
                onChange={() => setSelectedOption('certified')}
              />
              Nos marchands certifiés
            </label>
            <select
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-600 shadow-sm disabled:bg-slate-50"
              disabled={certifiedMerchantsDisabled}
              value={selectedMerchantId ?? ''}
              onChange={(event) => {
                setSelectedOption('certified');
                setSelectedMerchantId(event.target.value || null);
              }}
            >
              <option value="">
                {merchantRegistryQuery.isLoading
                  ? 'Chargement...'
                  : registryItems.length === 0
                    ? 'Aucun marchand disponible'
                    : 'Sélectionnez un marchand'}
              </option>
              {registryItems.map((merchant) => {
                const labelParts = [merchant.name, merchant.country_code].filter(Boolean);
                const label = labelParts.length > 0 ? labelParts.join(' ') : `Marchand ${merchant.id}`;
                return (
                  <option key={merchant.id} value={String(merchant.id)}>
                    {label}
                  </option>
                );
              })}
            </select>
            {merchantRegistryQuery.isError ? (
              <p className="text-xs text-rose-600">
                {extractErrorMessage(merchantRegistryQuery.error)}
              </p>
            ) : null}
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                type="radio"
                name="merchant-option"
                checked={selectedOption === 'my_merchants'}
                onChange={() => setSelectedOption('my_merchants')}
              />
              Vos marchands
            </label>
            <select
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-600 shadow-sm disabled:bg-slate-50"
              disabled={myMerchantsDisabled}
              value={selectedSuggestionId ?? ''}
              onChange={(event) => {
                setSelectedOption('my_merchants');
                setSelectedSuggestionId(event.target.value || null);
              }}
            >
              <option value="">
                {suggestionsQuery.isLoading
                  ? 'Chargement...'
                  : approvedSuggestions.length === 0
                    ? 'Aucun marchand approuvé'
                    : 'Sélectionnez un marchand'}
              </option>
              {approvedSuggestions.map((suggestion) => (
                <option key={suggestion.id} value={suggestion.id}>
                  {suggestion.name} ({suggestion.country_code})
                </option>
              ))}
            </select>
            {suggestionsQuery.isError ? (
              <p className="text-xs text-rose-600">
                {extractErrorMessage(suggestionsQuery.error)}
              </p>
            ) : null}
          </div>

          <div className="space-y-2 text-sm text-slate-700">
            <Link
              className="inline-flex items-center gap-2 text-emerald-700 hover:text-emerald-800"
              href={`/sender/merchant-suggestions/new?escrowId=${escrowId}`}
            >
              + Proposer un marchand
            </Link>
            <p className="text-xs text-slate-500">
              Votre marchand sera ajouté à la plateforme seulement après vérification par le
              support.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="outline" onClick={() => router.push(`/sender/escrows/${escrowId}`)}>
          Retour
        </Button>
        <Button disabled title={FINALIZE_TOOLTIP}>
          Disponible bientôt
        </Button>
      </div>
    </div>
  );
}
