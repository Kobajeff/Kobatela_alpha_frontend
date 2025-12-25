'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { extractErrorMessage } from '@/lib/apiClient';
import { normalizeApiError } from '@/lib/apiError';
import { createEscrowDraftFromMandate, setEscrowDraft } from '@/lib/prefill/escrowDraft';
import { useCleanupMandates, useCreateMandate } from '@/lib/queries/sender';
import type { PayoutDestinationType, UsageMandateCreate, UsageMandateRead } from '@/types/api';

const DEFAULT_CURRENCY = 'USD';

export default function SenderMandatesPage() {
  const router = useRouter();
  const createMandate = useCreateMandate();
  const cleanupMandates = useCleanupMandates();

  const [senderId, setSenderId] = useState('');
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
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [cleanupMessage, setCleanupMessage] = useState<string | null>(null);
  const [cleanupError, setCleanupError] = useState<string | null>(null);
  const [lastCleanupRun, setLastCleanupRun] = useState<string | null>(null);

  const payoutOptions: Array<{ value: PayoutDestinationType; label: string }> = useMemo(
    () => [
      { value: 'BENEFICIARY_PROVIDER', label: 'Bénéficiaire / Provider' },
      { value: 'MERCHANT', label: 'Merchant (Direct Pay)' }
    ],
    []
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setCopySuccess(null);
    setCreatedMandate(null);

    const parsedBeneficiaryId = Number(beneficiaryId);
    const parsedSenderId = senderId.trim() ? Number(senderId) : undefined;
    const trimmedTotalAmount = totalAmount.trim();
    const normalizedCurrency = (currency || DEFAULT_CURRENCY).trim().toUpperCase();
    const expiresInput = expiresAt.trim();

    if (!Number.isFinite(parsedBeneficiaryId)) {
      setErrorMessage('Veuillez saisir un identifiant bénéficiaire valide.');
      return;
    }

    if (senderId.trim() && !Number.isFinite(parsedSenderId)) {
      setErrorMessage('Veuillez saisir un identifiant expéditeur valide.');
      return;
    }

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

    const payload: UsageMandateCreate = {
      beneficiary_id: parsedBeneficiaryId,
      total_amount: trimmedTotalAmount,
      currency: normalizedCurrency,
      expires_at: expiresDate.toISOString(),
      payout_destination_type: payoutDestinationType
    };

    const finalPayload: UsageMandateCreate = { ...payload };
    if (parsedSenderId !== undefined && Number.isFinite(parsedSenderId)) {
      finalPayload.sender_id = parsedSenderId;
    }

    if (payoutDestinationType === 'MERCHANT') {
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
        finalPayload.merchant_registry_id = registryId;
      } else {
        finalPayload.merchant_suggestion = {
          name: suggestionName,
          country_code: suggestionCountry
        };
      }
    }

    try {
      const result = await createMandate.mutateAsync(finalPayload);
      setCreatedMandate(result);
      setErrorMessage(null);
    } catch (error) {
      const normalized = normalizeApiError(error);
      if (normalized.status === 403) {
        setErrorMessage('Accès refusé : portée insuffisante pour créer un mandat.');
        return;
      }
      setErrorMessage(normalized.message ?? extractErrorMessage(error));
    }
  };

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

  const handleCleanup = async () => {
    setCleanupError(null);
    setCleanupMessage(null);
    try {
      const result = await cleanupMandates.mutateAsync();
      const expiredCount = result?.expired_count ?? 0;
      const timestamp = new Date().toISOString();
      setLastCleanupRun(timestamp);
      setCleanupMessage(`${expiredCount} mandat(s) expiré(s).`);
    } catch (error) {
      const normalized = normalizeApiError(error);
      if (normalized.status === 403) {
        setCleanupError('Accès refusé : portée insuffisante pour expirer des mandats.');
        return;
      }
      setCleanupError(normalized.message ?? extractErrorMessage(error));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Mandats d&apos;usage</h1>
        <p className="mt-1 text-sm text-slate-600">
          Créez un mandat pour vos bénéficiaires et expirez les mandats périmés côté expéditeur.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Créer un mandat</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {errorMessage && <ErrorAlert message={errorMessage} />}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Sender ID (optionnel)</label>
                <Input
                  type="number"
                  min="0"
                  value={senderId}
                  onChange={(event) => setSenderId(event.target.value)}
                  placeholder="123"
                  disabled={createMandate.isPending}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Beneficiary ID</label>
                <Input
                  type="number"
                  min="0"
                  value={beneficiaryId}
                  onChange={(event) => setBeneficiaryId(event.target.value)}
                  placeholder="456"
                  required
                  disabled={createMandate.isPending}
                />
              </div>
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
                  onChange={(event) => setPayoutDestinationType(event.target.value as PayoutDestinationType)}
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
                      onChange={() => setMerchantMode('registry')}
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
                      onChange={() => setMerchantMode('suggestion')}
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
                  setSenderId('');
                  setBeneficiaryId('');
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
                <div className="rounded-md border border-green-200 bg-white p-3 text-green-900">
                  <p className="text-sm font-medium">Créer un escrow à partir de ce mandate</p>
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
                    Créer un escrow à partir de ce mandate
                  </Button>
                </div>
                <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-slate-900 p-3 text-xs text-slate-100">
                  {JSON.stringify(createdMandate, null, 2)}
                </pre>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nettoyage des mandats expirés</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {cleanupError && <ErrorAlert message={cleanupError} />}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={handleCleanup} disabled={cleanupMandates.isPending}>
              {cleanupMandates.isPending ? 'Nettoyage en cours...' : 'Expire old mandates'}
            </Button>
            {cleanupMessage && (
              <span className="text-sm font-medium text-green-700">{cleanupMessage}</span>
            )}
          </div>
          {lastCleanupRun && (
            <p className="text-sm text-slate-700">
              Dernier nettoyage: {new Date(lastCleanupRun).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
