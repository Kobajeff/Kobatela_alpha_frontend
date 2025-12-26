'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAxiosError } from 'axios';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { extractErrorMessage } from '@/lib/apiClient';
import { normalizeApiError } from '@/lib/apiError';
import { createEscrowDraftFromMandate, setEscrowDraft } from '@/lib/prefill/escrowDraft';
import { useAdminUsers } from '@/lib/queries/admin';
import { normalizePaginatedItems } from '@/lib/queries/queryUtils';
import { useAuthMe, useCleanupMandates, useCreateMandate } from '@/lib/queries/sender';
import type { AuthUser, PayoutDestinationType, UsageMandateCreate, UsageMandateRead, User } from '@/types/api';

const DEFAULT_CURRENCY = 'USD';

export default function SenderMandatesPage() {
  const router = useRouter();
  const { data: authUser } = useAuthMe();
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
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

  const pickerAllowedRoles = new Set<AuthUser['role']>(['admin', 'both']);
  const canPickBeneficiary = authUser?.role ? pickerAllowedRoles.has(authUser.role) : false;

  const adminUsersQuery = useAdminUsers(
    { limit: 50, offset: 0, q: pickerSearch || undefined },
    { enabled: isPickerOpen && canPickBeneficiary }
  );
  const adminUsers = useMemo<User[]>(
    () => normalizePaginatedItems<User>(adminUsersQuery.data),
    [adminUsersQuery.data]
  );
  const adminUsersForbidden =
    adminUsersQuery.isError &&
    isAxiosError(adminUsersQuery.error) &&
    adminUsersQuery.error.response?.status === 403;

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
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Beneficiary ID</label>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    value={beneficiaryId}
                    onChange={(event) => setBeneficiaryId(event.target.value)}
                    placeholder="456"
                    required
                    disabled={createMandate.isPending}
                    className="md:w-56"
                  />
                  {canPickBeneficiary && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsPickerOpen(true)}
                      disabled={createMandate.isPending}
                    >
                      Choisir un bénéficiaire
                    </Button>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Vous pouvez trouver l&apos;ID dans Admin → Users (colonne User ID).
                </p>
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

      {isPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl space-y-4 rounded-lg bg-white p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Sélectionner un bénéficiaire</h2>
                <p className="text-xs text-slate-500">Disponible pour les rôles admin/both.</p>
              </div>
              <button
                type="button"
                className="rounded-md border px-3 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                onClick={() => setIsPickerOpen(false)}
              >
                Fermer
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                className="w-64 rounded-md border px-3 py-2 text-sm"
                placeholder="Rechercher par email..."
                value={pickerSearch}
                onChange={(event) => setPickerSearch(event.target.value)}
              />
              <button
                type="button"
                className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                onClick={() => adminUsersQuery.refetch()}
                disabled={adminUsersQuery.isFetching}
              >
                {adminUsersQuery.isFetching ? 'Recherche...' : 'Rechercher'}
              </button>
            </div>

            {adminUsersQuery.isLoading && (
              <p className="text-sm text-slate-600">Chargement des utilisateurs...</p>
            )}

            {adminUsersForbidden && (
              <ErrorAlert message="Access denied (admin scope required) pour l'annuaire utilisateurs." />
            )}

            {adminUsersQuery.isError && !adminUsersForbidden && (
              <ErrorAlert message={extractErrorMessage(adminUsersQuery.error)} />
            )}

            {!adminUsersQuery.isLoading && !adminUsersQuery.isError && adminUsers.length === 0 && (
              <p className="text-sm text-slate-600">Aucun utilisateur trouvé.</p>
            )}

            {!adminUsersQuery.isLoading && !adminUsersQuery.isError && adminUsers.length > 0 && (
              <div className="max-h-96 overflow-auto rounded-md border">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">User ID</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Email</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Rôle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {adminUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => {
                          setBeneficiaryId(String(user.id));
                          setIsPickerOpen(false);
                        }}
                      >
                        <td className="px-4 py-2 font-mono text-xs">{user.id}</td>
                        <td className="px-4 py-2">{user.email}</td>
                        <td className="px-4 py-2 capitalize">{user.role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
