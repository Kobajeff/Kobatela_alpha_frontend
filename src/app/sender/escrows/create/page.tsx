'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { extractErrorMessage } from '@/lib/apiClient';
import { clearEscrowDraft, createEscrowDraftFromMandate, getEscrowDraft, type EscrowDraftPrefill } from '@/lib/prefill/escrowDraft';
import { useCreateEscrow, useCreateEscrowMilestones, useEscrowMilestones, useMandate } from '@/lib/queries/sender';
import type {
  EscrowDestination,
  EscrowCreatePayload,
  EscrowRead,
  EscrowReleaseConditionMilestone,
  EscrowReleaseConditions,
  MilestoneCreatePayload
} from '@/types/api';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { MilestonesEditor } from '@/components/sender/milestones/MilestonesEditor';
import { EscrowDestinationSelector } from '@/components/sender/escrows/EscrowDestinationSelector';

const DEFAULT_CURRENCY = 'EUR';
const DEFAULT_DOMAIN: 'private' = 'private';
const ALLOWED_CURRENCIES = ['USD', 'EUR'] as const;

export default function SenderCreateEscrowPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromMandateId = searchParams.get('from_mandate');
  const shouldPrefillFromQuery = searchParams.get('prefill') === '1';
  const mandateQuery = useMandate(shouldPrefillFromQuery ? fromMandateId ?? undefined : undefined);

  const createEscrow = useCreateEscrow();
  const createEscrowMilestones = useCreateEscrowMilestones();
  const [amountTotal, setAmountTotal] = useState('');
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [deadlineAt, setDeadlineAt] = useState('');
  const [domain, setDomain] = useState<'private' | 'public' | 'aid'>(DEFAULT_DOMAIN);
  const [requiresProof, setRequiresProof] = useState(true);
  const [milestoneDrafts, setMilestoneDrafts] = useState<MilestoneCreatePayload[]>([]);
  const [destination, setDestination] = useState<EscrowDestination | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [milestoneCreationError, setMilestoneCreationError] = useState<string | null>(null);
  const [draftInfo, setDraftInfo] = useState<EscrowDraftPrefill | null>(null);
  const [prefillApplied, setPrefillApplied] = useState(false);
  const [createdEscrow, setCreatedEscrow] = useState<EscrowRead | null>(null);
  const [createdEscrowId, setCreatedEscrowId] = useState<string | number | null>(null);

  const createdMilestonesQuery = useEscrowMilestones(createdEscrowId ? String(createdEscrowId) : '');

  const applyDraft = (draft: EscrowDraftPrefill | null) => {
    if (!draft) return;
    const payload = draft.payload ?? {};
    if (typeof payload.amount_total === 'number' || typeof payload.amount_total === 'string') {
      // Contract: docs/Backend_info/API_GUIDE (7).md — EscrowCreate — amount_total
      setAmountTotal(String(payload.amount_total));
    }
    if (typeof payload.currency === 'string') {
      // Contract: docs/Backend_info/API_GUIDE (7).md — EscrowCreate — currency
      setCurrency(String(payload.currency).toUpperCase());
    }
    if (typeof payload.provider_user_id === 'number' || typeof payload.provider_user_id === 'string') {
      // Contract: docs/Backend_info/API_GUIDE (7).md — EscrowCreate — provider_user_id
      setDestination({
        type: 'provider',
        provider_user_id: String(payload.provider_user_id)
      });
    }
    setDraftInfo(draft);
  };

  useEffect(() => {
    if (prefillApplied) return;
    if (shouldPrefillFromQuery && mandateQuery.isLoading) return;
    if (mandateQuery.data) {
      const draft = createEscrowDraftFromMandate(mandateQuery.data);
      applyDraft(draft);
      setDraftInfo(draft);
      setPrefillApplied(true);
      return;
    }
    if (shouldPrefillFromQuery && mandateQuery.isError) {
      setErrorMessage(extractErrorMessage(mandateQuery.error));
      setPrefillApplied(true);
      return;
    }
    const storedDraft = getEscrowDraft();
    if (storedDraft) {
      applyDraft(storedDraft);
    }
    setPrefillApplied(true);
  }, [
    mandateQuery.data,
    mandateQuery.error,
    mandateQuery.isError,
    mandateQuery.isLoading,
    prefillApplied,
    shouldPrefillFromQuery
  ]);

  const resetDraft = () => {
    clearEscrowDraft();
    setDraftInfo(null);
    setAmountTotal('');
    setCurrency(DEFAULT_CURRENCY);
    setDestination(null);
    setCreatedEscrow(null);
    setCreatedEscrowId(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setMilestoneCreationError(null);
    setCreatedEscrow(null);
    setCreatedEscrowId(null);

    const normalizedAmount = amountTotal.trim();
    const parsedAmount = Number(normalizedAmount);
    if (!normalizedAmount || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Veuillez saisir un montant total valide.');
      return;
    }

    const normalizedCurrency = currency.trim().toUpperCase() || DEFAULT_CURRENCY;
    if (!ALLOWED_CURRENCIES.includes(normalizedCurrency as (typeof ALLOWED_CURRENCIES)[number])) {
      setErrorMessage('La devise doit être USD ou EUR.');
      return;
    }
    if (!deadlineAt) {
      setErrorMessage('La date limite est requise.');
      return;
    }
    const deadlineIso = new Date(deadlineAt).toISOString();

    if (!destination) {
      setErrorMessage('Sélectionnez un destinataire (prestataire ou bénéficiaire).');
      return;
    }

    const releaseConditions: EscrowReleaseConditions = {
      // Contract: docs/Backend_info/API_GUIDE (7).md — EscrowCreate — release_conditions.requires_proof
      requires_proof: requiresProof
    };

    const hasMilestones = milestoneDrafts.length > 0;
    if (hasMilestones) {
      const seenIndexes = new Set<number>();
      let cumulativeAmount = 0;
      for (const milestone of milestoneDrafts) {
        if (!milestone.label.trim()) {
          setErrorMessage('Chaque milestone doit avoir un libellé.');
          return;
        }
        const milestoneAmount = Number(milestone.amount);
        if (!milestone.amount || !Number.isFinite(milestoneAmount) || milestoneAmount <= 0) {
          setErrorMessage('Chaque milestone doit avoir un montant positif.');
          return;
        }
        cumulativeAmount += milestoneAmount;
        if (cumulativeAmount > parsedAmount) {
          setErrorMessage('La somme des milestones dépasse le montant total de l’escrow.');
          return;
        }
        if (!milestone.currency.trim() || milestone.currency.toUpperCase() !== normalizedCurrency) {
          setErrorMessage('La devise des milestones doit correspondre à celle de l’escrow.');
          return;
        }
        if (milestone.sequence_index <= 0 || seenIndexes.has(milestone.sequence_index)) {
          setErrorMessage('Les index de milestones doivent être uniques et positifs.');
          return;
        }
        seenIndexes.add(milestone.sequence_index);
      }
      releaseConditions.milestones = milestoneDrafts.map<EscrowReleaseConditionMilestone>((milestone) => ({
        // Contract: docs/Backend_info/API_GUIDE (7).md — EscrowCreate.release_conditions.milestones — label
        label: milestone.label,
        // Contract: docs/Backend_info/API_GUIDE (7).md — EscrowCreate.release_conditions.milestones — idx
        idx: milestone.sequence_index
      }));
    }

    const payload: EscrowCreatePayload = {
      // Contract: docs/Backend_info/API_GUIDE (7).md — EscrowCreate — amount_total
      amount_total: normalizedAmount,
      // Contract: docs/Backend_info/API_GUIDE (7).md — EscrowCreate — currency
      currency: normalizedCurrency,
      // Contract: docs/Backend_info/API_GUIDE (7).md — EscrowCreate — release_conditions
      release_conditions: releaseConditions,
      // Contract: docs/Backend_info/API_GUIDE (7).md — EscrowCreate — deadline_at
      deadline_at: deadlineIso,
      // Contract: docs/Backend_info/API_GUIDE (7).md — EscrowCreate — domain
      domain
    };

    if (destination.type === 'provider') {
      const trimmedProviderId = destination.provider_user_id.trim();
      const parsedProviderId = Number(trimmedProviderId);
      if (!trimmedProviderId || !Number.isFinite(parsedProviderId) || parsedProviderId <= 0) {
        setErrorMessage('Identifiant prestataire invalide.');
        return;
      }
      payload.provider_user_id = parsedProviderId; // Contract: docs/Backend_info/API_GUIDE (7).md — EscrowCreate — provider_user_id
    } else {
      const { beneficiary } = destination;
      const full_name = beneficiary.full_name.trim();
      const email = beneficiary.email.trim();
      const phone_number = beneficiary.phone_number.trim();
      const address_line1 = beneficiary.address_line1.trim();
      const address_country_code = beneficiary.address_country_code.trim();
      const bank_account = beneficiary.bank_account.trim();
      const national_id_number = beneficiary.national_id_number?.trim();

      if (!full_name || !email || !phone_number || !address_line1 || !address_country_code || !bank_account) {
        setErrorMessage('Tous les champs bénéficiaire sont requis (sauf identifiant national).');
        return;
      }
      payload.beneficiary = {
        // Contract: docs/Backend_info/API_GUIDE (7).md — BeneficiaryCreate — full_name
        full_name,
        // Contract: docs/Backend_info/API_GUIDE (7).md — BeneficiaryCreate — email
        email,
        // Contract: docs/Backend_info/API_GUIDE (7).md — BeneficiaryCreate — phone_number
        phone_number,
        // Contract: docs/Backend_info/API_GUIDE (7).md — BeneficiaryCreate — address_line1
        address_line1,
        // Contract: docs/Backend_info/API_GUIDE (7).md — BeneficiaryCreate — address_country_code
        address_country_code,
        // Contract: docs/Backend_info/API_GUIDE (7).md — BeneficiaryCreate — bank_account
        bank_account,
        // Contract: docs/Backend_info/API_GUIDE (7).md — BeneficiaryCreate — national_id_number
        national_id_number: national_id_number || undefined
      };
    }

    try {
      const created = await createEscrow.mutateAsync(payload);
      clearEscrowDraft();
      setCreatedEscrow(created);
      setCreatedEscrowId(created.id);

      if (hasMilestones) {
        try {
          await createEscrowMilestones.mutateAsync({
            escrowId: created.id,
            milestones: milestoneDrafts
          });
          await createdMilestonesQuery.refetch();
        } catch (error) {
          setMilestoneCreationError(extractErrorMessage(error));
        }
      }
    } catch (error) {
      setErrorMessage(extractErrorMessage(error));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Créer un escrow</h1>
        <p className="mt-1 text-sm text-slate-600">
          Renseignez les informations principales pour démarrer un nouvel escrow.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Détails de l&apos;escrow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {draftInfo && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p>
                  Formulaire pré-rempli depuis mandate{' '}
                  <span className="font-mono">{String(draftInfo.mandate_id)}</span>.
                </p>
                <Button type="button" size="sm" variant="outline" onClick={resetDraft}>
                  Effacer
                </Button>
              </div>
            </div>
          )}

          {errorMessage && <ErrorAlert message={errorMessage} />}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Montant total</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amountTotal}
                  onChange={(event) => setAmountTotal(event.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Devise</label>
                <select
                  className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value as typeof currency)}
                  required
                >
                  {ALLOWED_CURRENCIES.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Date limite</label>
                <Input
                  type="datetime-local"
                  value={deadlineAt}
                  onChange={(event) => setDeadlineAt(event.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Domaine</label>
                <select
                  className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  value={domain}
                  onChange={(event) => setDomain(event.target.value as typeof domain)}
                >
                  <option value="private">Privé</option>
                  <option value="public">Public</option>
                  <option value="aid">Aid</option>
                </select>
              </div>
            </div>

            <EscrowDestinationSelector
              destination={destination}
              onChange={setDestination}
              disabled={createEscrow.isPending || createEscrowMilestones.isPending}
            />

            <div className="space-y-3 rounded-md border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-800">Conditions de libération</p>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={requiresProof}
                    onChange={(event) => setRequiresProof(event.target.checked)}
                  />
                  Preuve requise
                </label>
              </div>
              <MilestonesEditor
                milestones={milestoneDrafts}
                onChange={setMilestoneDrafts}
                totalAmount={amountTotal}
                currency={currency}
              />
              <p className="text-xs text-slate-600">
                Les milestones sont créées après l&apos;escrow via l&apos;endpoint dédié (POST /escrows/{{id}}/milestones) accessible à l&apos;expéditeur tant que l&apos;escrow est en brouillon.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={createEscrow.isPending || createEscrowMilestones.isPending}>
                {createEscrow.isPending || createEscrowMilestones.isPending ? 'Création en cours...' : 'Créer l\'escrow'}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={createEscrow.isPending || createEscrowMilestones.isPending}
                onClick={() => router.push('/sender/escrows')}
              >
                Annuler
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {createdEscrow && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Escrow créé</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900">
              Création réussie. Certaines informations bénéficiaire peuvent être masquées côté backend conformément aux règles de redaction.
            </div>
            <ul className="space-y-2 text-sm text-slate-800">
              <li>
                <span className="font-medium">ID:</span>{' '}
                <span className="font-mono">{String(createdEscrow.id)}</span>
              </li>
              <li>
                <span className="font-medium">Montant:</span> {createdEscrow.amount_total} {createdEscrow.currency}
              </li>
              <li>
                <span className="font-medium">Échéance:</span>{' '}
                {createdEscrow.deadline_at
                  ? new Date(createdEscrow.deadline_at).toLocaleString()
                  : 'Non renseignée'}
              </li>
              <li>
                <span className="font-medium">Destinataire:</span>{' '}
                {createdEscrow.provider_user_id
                  ? `Prestataire #${createdEscrow.provider_user_id}`
                  : createdEscrow.beneficiary_profile
                    ? `${createdEscrow.beneficiary_profile.full_name ?? 'Profil bénéficiaire'}${
                        createdEscrow.beneficiary_profile.masked ? ' (données masquées)' : ''
                      }`
                    : 'Profil bénéficiaire indisponible ou masqué'}
              </li>
            </ul>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => router.push(`/sender/escrows/${createdEscrow.id}`)}>
                Voir l&apos;escrow
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/sender/escrows/${createdEscrow.id}#milestones`)}
              >
                Ajouter des milestones
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {createdEscrowId && milestoneDrafts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Milestones créés pour l&apos;escrow {createdEscrowId}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {milestoneCreationError && <ErrorAlert message={milestoneCreationError} />}
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={createEscrowMilestones.isPending}
                onClick={async () => {
                  if (!createdEscrowId) return;
                  setMilestoneCreationError(null);
                  try {
                    await createEscrowMilestones.mutateAsync({
                      escrowId: createdEscrowId,
                      milestones: milestoneDrafts
                    });
                    await createdMilestonesQuery.refetch();
                  } catch (error) {
                    setMilestoneCreationError(extractErrorMessage(error));
                  }
                }}
              >
                Réessayer création milestones
              </Button>
              <Button variant="link" onClick={() => router.push(`/sender/escrows/${createdEscrowId}`)}>
                Ouvrir l&apos;escrow
              </Button>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-800">Liste retournée par le backend</p>
              <div className="space-y-2 rounded-md border border-slate-200 p-3">
                {(createdMilestonesQuery.data ?? []).length === 0 ? (
                  <p className="text-sm text-slate-600">Aucun milestone disponible pour le moment.</p>
                ) : (
                  <ul className="space-y-2 text-sm text-slate-800">
                    {createdMilestonesQuery.data?.map((milestone) => (
                      <li key={milestone.id} className="rounded border border-slate-100 p-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium">#{milestone.sequence_index} — {milestone.label}</span>
                          <span className="text-slate-700">
                            {milestone.amount} {milestone.currency}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">Statut: {milestone.status}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
