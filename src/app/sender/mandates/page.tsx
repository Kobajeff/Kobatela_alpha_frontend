'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { extractErrorMessage } from '@/lib/apiClient';
import { normalizeApiError } from '@/lib/apiError';
import { createEscrowDraftFromMandate, setEscrowDraft } from '@/lib/prefill/escrowDraft';
import { queryKeys } from '@/lib/queryKeys';
import { useCreateMandate } from '@/lib/queries/sender';
import type {
  BeneficiaryOffPlatformCreate,
  PayoutDestinationType,
  UsageMandateCreate,
  UsageMandateRead
} from '@/types/api';

const DEFAULT_CURRENCY = 'USD';
const DEFAULT_BENEFICIARY_OFF_PLATFORM: BeneficiaryOffPlatformCreate = {
  full_name: '',
  email: '',
  phone_number: '',
  address_line1: '',
  address_country_code: '',
  bank_account: '',
  national_id_number: ''
};

type MandateDestinationSnapshot =
  | { type: 'on-platform'; beneficiaryId: number }
  | { type: 'off-platform'; beneficiary: BeneficiaryOffPlatformCreate };

export default function SenderMandatesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const createMandate = useCreateMandate();

  const [targetType, setTargetType] = useState<'on-platform' | 'off-platform'>('on-platform');
  const [beneficiaryId, setBeneficiaryId] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [expiresAt, setExpiresAt] = useState('');
  const [payoutDestinationType, setPayoutDestinationType] =
    useState<PayoutDestinationType>('BENEFICIARY_PROVIDER');
  const [merchantMode, setMerchantMode] = useState<'registry' | 'suggestion'>('registry');
  const [merchantRegistryId, setMerchantRegistryId] = useState('');
  const [merchantName, setMerchantName] = useState('');
  const [merchantCountryCode, setMerchantCountryCode] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdMandate, setCreatedMandate] = useState<UsageMandateRead | null>(null);
  const [createdDestination, setCreatedDestination] = useState<MandateDestinationSnapshot | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [beneficiaryOffPlatform, setBeneficiaryOffPlatform] = useState<BeneficiaryOffPlatformCreate>(
    DEFAULT_BENEFICIARY_OFF_PLATFORM
  );

  const payoutOptions: Array<{ value: PayoutDestinationType; label: string }> = [
    { value: 'BENEFICIARY_PROVIDER', label: 'Bénéficiaire / Provider' },
    { value: 'MERCHANT', label: 'Merchant (Direct Pay)' }
  ];

  const handleTargetTypeChange = (nextType: 'on-platform' | 'off-platform') => {
    setTargetType(nextType);
    setErrorMessage(null);
    setCopySuccess(null);
    setCreatedMandate(null);
    setCreatedDestination(null);
    if (nextType === 'on-platform') {
      setBeneficiaryOffPlatform(DEFAULT_BENEFICIARY_OFF_PLATFORM);
    } else {
      setBeneficiaryId('');
    }
  };

  const handlePayoutDestinationChange = (value: PayoutDestinationType) => {
    setPayoutDestinationType(value);
    setErrorMessage(null);
    if (value !== 'MERCHANT') {
      setMerchantRegistryId('');
      setMerchantName('');
      setMerchantCountryCode('');
      setMerchantMode('registry');
    }
  };

  const handleMerchantModeChange = (mode: 'registry' | 'suggestion') => {
    setMerchantMode(mode);
    setMerchantRegistryId('');
    setMerchantName('');
    setMerchantCountryCode('');
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setCopySuccess(null);
    setCreatedMandate(null);

    const trimmedTotalAmount = totalAmount.trim();
    const normalizedCurrency = (currency || DEFAULT_CURRENCY).trim().toUpperCase();
    const expiresInput = expiresAt.trim();

    if (!trimmedTotalAmount) {
      setErrorMessage('Veuillez saisir un montant total.');
      return;
    }

    if (!expiresInput) {
      setErrorMessage('Veuillez indiquer une date d\'expiration.');
      return;
    }

    const expiresDate = new Date(expiresInput);
    if (Number.isNaN(expiresDate.getTime())) {
      setErrorMessage('La date d\'expiration doit être valide.');
      return;
    }

    const basePayload = {
      total_amount: trimmedTotalAmount, // Contract: docs/Backend_info/FRONTEND_MANDATE_ESCROW_UX_CONTRACT (3).md — Create Mandate — required total_amount
      currency: normalizedCurrency, // Contract: docs/Backend_info/FRONTEND_MANDATE_ESCROW_UX_CONTRACT (3).md — Create Mandate — currency normalized
      expires_at: expiresDate.toISOString(), // Contract: docs/Backend_info/FRONTEND_MANDATE_ESCROW_UX_CONTRACT (3).md — Create Mandate — expires_at ISO
      payout_destination_type: payoutDestinationType // Contract: docs/Backend_info/FRONTEND_MANDATE_ESCROW_UX_CONTRACT (3).md — Create Mandate — payout_destination_type
    };

    let destinationPayload: UsageMandateCreate | null = null;

    if (targetType === 'on-platform') {
      const parsedBeneficiaryId = Number(beneficiaryId);
      if (!Number.isFinite(parsedBeneficiaryId)) {
        setErrorMessage('Veuillez saisir un identifiant bénéficiaire valide.');
        return;
      }
      destinationPayload = {
        ...basePayload,
        beneficiary_id: parsedBeneficiaryId // Contract: docs/Backend_info/FRONTEND_MANDATE_ESCROW_UX_CONTRACT (3).md — Create Mandate — beneficiary_id XOR beneficiary
      };
    } else {
      const {
        full_name,
        email,
        phone_number,
        address_line1,
        address_country_code,
        bank_account,
        national_id_number
      } = beneficiaryOffPlatform;

      const requiredOffPlatformFields = [
        full_name,
        email,
        phone_number,
        address_line1,
        address_country_code,
        bank_account
      ];

      if (requiredOffPlatformFields.some((value) => !value.trim())) {
        setErrorMessage('Renseignez tous les champs du bénéficiaire hors plateforme.');
        return;
      }

      destinationPayload = {
        ...basePayload,
        beneficiary: {
          full_name: full_name.trim(), // Contract: docs/Backend_info/FRONTEND_MANDATE_ESCROW_UX_CONTRACT (3).md — Off-platform beneficiary identity (name)
          email: email.trim(), // Contract: docs/Backend_info/FRONTEND_MANDATE_ESCROW_UX_CONTRACT (3).md — Off-platform beneficiary identity (contact)
          phone_number: phone_number.trim(), // Contract: docs/Backend_info/FRONTEND_MANDATE_ESCROW_UX_CONTRACT (3).md — Off-platform beneficiary identity (phone)
          address_line1: address_line1.trim(), // Contract: docs/Backend_info/FRONTEND_MANDATE_ESCROW_UX_CONTRACT (3).md — Off-platform beneficiary identity (address)
          address_country_code: address_country_code.trim().toUpperCase(), // Contract: docs/Backend_info/FRONTEND_MANDATE_ESCROW_UX_CONTRACT (3).md — Off-platform beneficiary identity (address country)
          bank_account: bank_account.trim(), // Contract: docs/Backend_info/BACKEND_MANDATE_MILESTONE_IDENTITY_AUDIT (1).md — Beneficiary identity requires bank_account
          ...(national_id_number?.trim()
            ? {
                national_id_number: national_id_number.trim()
              }
            : {})
        }
      };
    }

    if (payoutDestinationType === 'MERCHANT' && destinationPayload) {
      const registryId = merchantRegistryId.trim();
      const suggestionName = merchantName.trim();
      const suggestionCountry = merchantCountryCode.trim().toUpperCase();
      const hasRegistry = Boolean(registryId);
      const hasSuggestion = Boolean(suggestionName && suggestionCountry);

      if (hasRegistry && hasSuggestion) {
        setErrorMessage('Sélectionnez soit un identifiant registre, soit une suggestion, pas les deux.');
        return;
      }

      if (!hasRegistry && !hasSuggestion) {
        setErrorMessage('Pour un payout marchand, renseignez un registre ou une suggestion complète.');
        return;
      }

      if (hasRegistry) {
        destinationPayload = {
          ...destinationPayload,
          merchant_registry_id: registryId // Contract: docs/Backend_info/FRONTEND_MANDATE_ESCROW_UX_CONTRACT (3).md — Direct Pay merchant_registry_id
        };
      } else {
        destinationPayload = {
          ...destinationPayload,
          merchant_suggestion: {
            name: suggestionName, // Contract: docs/Backend_info/FRONTEND_API_GUIDE (8).md — UsageMandateCreate merchant_suggestion name
            country_code: suggestionCountry // Contract: docs/Backend_info/FRONTEND_API_GUIDE (8).md — UsageMandateCreate merchant_suggestion country_code
          }
        };
      }
    }

    if (!destinationPayload) {
      setErrorMessage('Sélectionnez une destination valide pour le mandat.');
      return;
    }

    try {
      const result = await createMandate.mutateAsync(destinationPayload);
      setCreatedMandate(result);
      if (targetType === 'on-platform') {
        setCreatedDestination({
          type: 'on-platform',
          beneficiaryId: Number(beneficiaryId)
        });
      } else {
        setCreatedDestination({
          type: 'off-platform',
          beneficiary: {
            ...beneficiaryOffPlatform,
            full_name: beneficiaryOffPlatform.full_name.trim(),
            email: beneficiaryOffPlatform.email.trim(),
            phone_number: beneficiaryOffPlatform.phone_number.trim(),
            address_line1: beneficiaryOffPlatform.address_line1.trim(),
            address_country_code: beneficiaryOffPlatform.address_country_code.trim().toUpperCase(),
            bank_account: beneficiaryOffPlatform.bank_account.trim(),
            national_id_number: beneficiaryOffPlatform.national_id_number?.trim() || ''
          }
        });
      }
      setErrorMessage(null);
    } catch (error) {
      const normalized = normalizeApiError(error);
      if (normalized.status === 403) {
        setErrorMessage('Scope insuffisant pour créer un mandat.');
        return;
      }
      if (normalized.status === 422) {
        const validationDetails = Array.isArray(normalized.details)
          ? (normalized.details as Array<{ loc?: Array<string | number> }>)
          : undefined;
        const fieldError =
          validationDetails && validationDetails.length > 0
            ? Array.isArray(validationDetails[0]?.loc)
              ? validationDetails[0]?.loc?.join('.')
              : undefined
            : undefined;
        setErrorMessage(
          fieldError
            ? `Payload invalide (champ: ${fieldError}).`
            : 'Payload invalide pour la création du mandat.'
        );
        return;
      }
      setErrorMessage(normalized.message ?? extractErrorMessage(error));
    }
  };

  const destinationSummary = (() => {
    if (!createdMandate && !createdDestination) return null;
    const providerId =
      createdMandate?.provider_user_id ??
      createdMandate?.beneficiary_id ??
      (createdDestination?.type === 'on-platform' ? createdDestination.beneficiaryId : null);
    if (providerId) {
      return {
        label: 'Utilisateur Kobatela',
        detail: `ID utilisateur: ${providerId}`
      };
    }

    const profile = createdMandate?.beneficiary_profile;
    const name =
      profile?.full_name ??
      (createdDestination?.type === 'off-platform' ? createdDestination.beneficiary.full_name : null);
    const country =
      profile?.address_country_code ??
      (createdDestination?.type === 'off-platform'
        ? createdDestination.beneficiary.address_country_code
        : null);

    return {
      label: 'Bénéficiaire hors plateforme',
      detail: [name, country].filter(Boolean).join(' · ') || 'Informations limitées'
    };
  })();

  const handleCopyId = async () => {
    if (!createdMandate?.id || typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(String(createdMandate.id));
      setCopySuccess('Identifiant copié dans le presse-papier.');
    } catch (_error) {
      setCopySuccess('Impossible de copier l\'identifiant.');
    }
    setTimeout(() => setCopySuccess(null), 2500);
  };

  const handleRefreshMandates = async () => {
    setRefreshError(null);
    setRefreshMessage(null);
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.sender.mandates.base()
      }); // Contract: docs/Backend_info/API_GUIDE (11).md — GET /mandates — sender scope cache refresh
      setRefreshMessage('Liste des mandats rafraîchie.');
    } catch (error) {
      setRefreshError(extractErrorMessage(error));
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Mandats d&apos;usage</h1>
        <p className="mt-1 text-sm text-slate-600">
          Créez un mandat pour vos bénéficiaires et rafraîchissez la liste lorsque nécessaire.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Créer un mandat</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {errorMessage && <ErrorAlert message={errorMessage} />}
            <div className="space-y-2 rounded-md border border-slate-200 p-4">
              <label className="block text-sm font-medium text-slate-700">Destination</label>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="targetType"
                    value="on-platform"
                    checked={targetType === 'on-platform'}
                    onChange={() => handleTargetTypeChange('on-platform')}
                    disabled={createMandate.isPending}
                  />
                  Destinataire sur la plateforme
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="targetType"
                    value="off-platform"
                    checked={targetType === 'off-platform'}
                    onChange={() => handleTargetTypeChange('off-platform')}
                    disabled={createMandate.isPending}
                  />
                  Bénéficiaire hors plateforme
                </label>
              </div>
              <p className="text-xs text-slate-500">
                Sélectionnez soit un utilisateur existant, soit un bénéficiaire hors plateforme (XOR).
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Montant total</label>
                <Input
                  type="text"
                  value={totalAmount}
                  onChange={(event) => setTotalAmount(event.target.value)}
                  placeholder="100.00"
                  required
                  disabled={createMandate.isPending}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Devise</label>
                <Input
                  type="text"
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value)}
                  placeholder={DEFAULT_CURRENCY}
                  required
                  disabled={createMandate.isPending}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Expiration</label>
                <Input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(event) => setExpiresAt(event.target.value)}
                  required
                  disabled={createMandate.isPending}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Destination de payout</label>
                <Select
                  value={payoutDestinationType}
                  onChange={(event) => handlePayoutDestinationChange(event.target.value as PayoutDestinationType)}
                  disabled={createMandate.isPending}
                >
                  {payoutOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {targetType === 'on-platform' && (
              <div className="space-y-2 rounded-md border border-slate-200 p-4">
                <label className="block text-sm font-medium text-slate-700">
                  Recipient user ID (on-platform)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={beneficiaryId}
                  onChange={(event) => setBeneficiaryId(event.target.value)}
                  placeholder="Identifiant utilisateur"
                  disabled={createMandate.isPending}
                  required
                />
                <p className="text-xs text-slate-500">
                  Utilisez l&apos;ID utilisateur du bénéficiaire (provider/recipient) présent sur la plateforme.
                </p>
              </div>
            )}

            {targetType === 'off-platform' && (
              <div className="space-y-3 rounded-md border border-slate-200 p-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Nom complet</label>
                    <Input
                      type="text"
                      value={beneficiaryOffPlatform.full_name}
                      onChange={(event) =>
                        setBeneficiaryOffPlatform((prev) => ({ ...prev, full_name: event.target.value }))
                      }
                      placeholder="Jane Doe"
                      required
                      disabled={createMandate.isPending}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Email</label>
                    <Input
                      type="email"
                      value={beneficiaryOffPlatform.email}
                      onChange={(event) =>
                        setBeneficiaryOffPlatform((prev) => ({ ...prev, email: event.target.value }))
                      }
                      placeholder="jane.doe@example.com"
                      required
                      disabled={createMandate.isPending}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Téléphone</label>
                    <Input
                      type="tel"
                      value={beneficiaryOffPlatform.phone_number}
                      onChange={(event) =>
                        setBeneficiaryOffPlatform((prev) => ({ ...prev, phone_number: event.target.value }))
                      }
                      placeholder="+2507..."
                      required
                      disabled={createMandate.isPending}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Compte bancaire / IBAN</label>
                    <Input
                      type="text"
                      value={beneficiaryOffPlatform.bank_account}
                      onChange={(event) =>
                        setBeneficiaryOffPlatform((prev) => ({ ...prev, bank_account: event.target.value }))
                      }
                      placeholder="FR76..."
                      required
                      disabled={createMandate.isPending}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Adresse (ligne 1)</label>
                    <Input
                      type="text"
                      value={beneficiaryOffPlatform.address_line1}
                      onChange={(event) =>
                        setBeneficiaryOffPlatform((prev) => ({
                          ...prev,
                          address_line1: event.target.value
                        }))
                      }
                      placeholder="123 Rue Exemple"
                      required
                      disabled={createMandate.isPending}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Code pays (adresse)</label>
                    <Input
                      type="text"
                      value={beneficiaryOffPlatform.address_country_code}
                      onChange={(event) =>
                        setBeneficiaryOffPlatform((prev) => ({
                          ...prev,
                          address_country_code: event.target.value
                        }))
                      }
                      placeholder="FR"
                      required
                      disabled={createMandate.isPending}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Numéro d&apos;identité (optionnel)</label>
                  <Input
                    type="text"
                    value={beneficiaryOffPlatform.national_id_number ?? ''}
                    onChange={(event) =>
                      setBeneficiaryOffPlatform((prev) => ({
                        ...prev,
                        national_id_number: event.target.value
                      }))
                    }
                    placeholder="ID national / passeport"
                    disabled={createMandate.isPending}
                  />
                </div>
              </div>
            )}

            {payoutDestinationType === 'MERCHANT' && (
              <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-medium text-slate-800">Payout marchand</span>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="radio"
                      name="merchant-mode"
                      value="registry"
                      checked={merchantMode === 'registry'}
                      onChange={() => handleMerchantModeChange('registry')}
                      disabled={createMandate.isPending}
                    />
                    Identifiant registre
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="radio"
                      name="merchant-mode"
                      value="suggestion"
                      checked={merchantMode === 'suggestion'}
                      onChange={() => handleMerchantModeChange('suggestion')}
                      disabled={createMandate.isPending}
                    />
                    Suggestion
                  </label>
                </div>

                {merchantMode === 'registry' ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Merchant registry ID</label>
                    <Input
                      type="text"
                      value={merchantRegistryId}
                      onChange={(event) => setMerchantRegistryId(event.target.value)}
                      placeholder="UUID du commerçant"
                      disabled={createMandate.isPending}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Nom du commerçant</label>
                      <Input
                        type="text"
                        value={merchantName}
                        onChange={(event) => setMerchantName(event.target.value)}
                        placeholder="Sample Merchant"
                        disabled={createMandate.isPending}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Code pays</label>
                      <Input
                        type="text"
                        value={merchantCountryCode}
                        onChange={(event) => setMerchantCountryCode(event.target.value)}
                        placeholder="FR"
                        disabled={createMandate.isPending}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={createMandate.isPending}>
                {createMandate.isPending ? 'Création en cours...' : 'Créer le mandat'}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={createMandate.isPending}
                onClick={() => {
                  setTargetType('on-platform');
                  setBeneficiaryId('');
                  setBeneficiaryOffPlatform(DEFAULT_BENEFICIARY_OFF_PLATFORM);
                  setTotalAmount('');
                  setCurrency(DEFAULT_CURRENCY);
                  setExpiresAt('');
                  setPayoutDestinationType('BENEFICIARY_PROVIDER');
                  setMerchantRegistryId('');
                  setMerchantName('');
                  setMerchantCountryCode('');
                  setMerchantMode('registry');
                  setErrorMessage(null);
                  setCopySuccess(null);
                  setCreatedMandate(null);
                  setCreatedDestination(null);
                }}
              >
                Réinitialiser
              </Button>
            </div>

            {createdMandate && (
              <div className="space-y-3 rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-900">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">Mandat créé avec succès</p>
                    <p className="text-green-800">
                      ID: <span className="font-mono text-green-900">{String(createdMandate.id)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={handleCopyId}>
                      Copier l&apos;ID
                    </Button>
                    {copySuccess && <span className="text-xs text-green-800">{copySuccess}</span>}
                  </div>
                </div>
                {destinationSummary && (
                  <div className="rounded-md border border-green-200 bg-white p-3 text-green-900">
                    <p className="text-xs uppercase text-green-700">Destination</p>
                    <p className="text-sm font-semibold">{destinationSummary.label}</p>
                    <p className="text-xs text-green-800">{destinationSummary.detail}</p>
                  </div>
                )}
                <div className="rounded-md border border-green-200 bg-white p-3 text-green-900">
                  <p className="text-sm font-medium">Créer un escrow à partir de ce mandat</p>
                  <p className="mt-1 text-xs text-green-800">
                    Pré-remplira l&apos;écran de création d&apos;escrow. Vous pourrez modifier avant validation.
                  </p>
                  <Button
                    type="button"
                    className="mt-3"
                    onClick={() => {
                      const draft = createEscrowDraftFromMandate(createdMandate);
                      setEscrowDraft(draft);
                      router.push('/sender/escrows/create');
                    }}
                  >
                    Créer un escrow à partir de ce mandat
                  </Button>
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rafraîchir les mandats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {refreshError && <ErrorAlert message={refreshError} />}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={handleRefreshMandates} disabled={isRefreshing}>
              {isRefreshing ? 'Rafraîchissement...' : 'Rafraîchir la liste des mandats'}
            </Button>
            {refreshMessage && (
              <span className="text-sm font-medium text-green-700">{refreshMessage}</span>
            )}
          </div>
          <p className="text-sm text-slate-700">
            Invalide le cache local et relance la récupération via le endpoint de liste des mandats.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
