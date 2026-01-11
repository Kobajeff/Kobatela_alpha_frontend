'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { extractErrorMessage } from '@/lib/apiClient';
import {
  clearEscrowDraft,
  createEscrowDraftFromMandate,
  createLocalEscrowDraft,
  getEscrowDraft,
  setEscrowDraft,
  type EscrowDraftPrefill
} from '@/lib/prefill/escrowDraft';
import {
  useCreateEscrow,
  useCreateEscrowMilestones,
  useEscrowMilestones,
  useMandate
} from '@/lib/queries/sender';
import type {
  BeneficiaryCreate,
  EscrowDestination,
  EscrowCreatePayload,
  EscrowReleaseConditionMilestone,
  EscrowReleaseConditions,
  MilestoneCreatePayload
} from '@/types/api';
import type { EscrowReadUI } from '@/types/ui';
import type { UIId } from '@/types/id';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input, type InputProps } from '@/components/ui/Input';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { MilestonesEditor } from '@/components/sender/milestones/MilestonesEditor';
import { EscrowDestinationSelector } from '@/components/sender/escrows/EscrowDestinationSelector';

const DEFAULT_CURRENCY = 'EUR';
const DEFAULT_DOMAIN: 'private' = 'private';
const ALLOWED_CURRENCIES = ['USD', 'EUR'] as const;

export default function SenderCreateEscrowClient() {
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
  const [createdEscrow, setCreatedEscrow] = useState<EscrowReadUI | null>(null);
  const [createdEscrowId, setCreatedEscrowId] = useState<UIId | null>(null);

  const createdMilestonesQuery = useEscrowMilestones(createdEscrowId ?? '');

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
    if (payload.beneficiary && typeof payload.beneficiary === 'object') {
      const beneficiary = payload.beneficiary as BeneficiaryCreate;
      setDestination({
        type: 'beneficiary',
        beneficiary: {
          // Contract: docs/Backend_info/API_GUIDE (7).md — BeneficiaryCreate — full_name
          full_name: beneficiary.full_name ?? '',
          // Contract: docs/Backend_info/API_GUIDE (7).md — BeneficiaryCreate — email
          email: beneficiary.email ?? '',
          // Contract: docs/Backend_info/API_GUIDE (7).md — BeneficiaryCreate — phone_number
          phone_number: beneficiary.phone_number ?? '',
          // Contract: docs/Backend_info/API_GUIDE (7).md — BeneficiaryCreate — address_line1
          address_line1: beneficiary.address_line1 ?? '',
          // Contract: docs/Backend_info/API_GUIDE (7).md — BeneficiaryCreate — address_country_code
          address_country_code: beneficiary.address_country_code ?? '',
          // Contract: docs/Backend_info/API_GUIDE (7).md — BeneficiaryCreate — bank_account
          bank_account: beneficiary.bank_account ?? '',
          // Contract: docs/Backend_info/API_GUIDE (7).md — BeneficiaryCreate — national_id_number
          national_id_number: beneficiary.national_id_number ?? ''
        }
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

  const handleSubmit = async () => {
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

    let providerUserId: number | undefined;
    if (destination.type === 'provider') {
      const parsedProviderUserId = Number(destination.provider_user_id);
      if (!Number.isFinite(parsedProviderUserId) || parsedProviderUserId <= 0) {
        setErrorMessage('Veuillez saisir un identifiant prestataire valide.');
        return;
      }
      providerUserId = parsedProviderUserId;
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
        idx: milestone.sequence_index
      }));
    }

    const payload: EscrowCreatePayload = {
      // Contract: docs/Backend_info/API_GUIDE (7).md — EscrowCreate — amount_total
      amount_total: normalizedAmount,
      // Contract: docs/Backend_info/API_GUIDE (7).md — EscrowCreate — currency
      currency: normalizedCurrency,
      // Contract: docs/Backend_info/API_GUIDE (7).md — EscrowCreate — deadline_at
      deadline_at: deadlineIso,
      // Contract: docs/Backend_info/API_GUIDE (7).md — EscrowCreate — release_conditions
      release_conditions: releaseConditions,
      // Contract: docs/Backend_info/API_GUIDE (7).md — EscrowCreate — requires_proof
      requires_proof: requiresProof,
      // Contract: docs/Backend_info/API_GUIDE (7).md — EscrowCreate — domain
      domain,
      // Contract: docs/Backend_info/API_GUIDE (7).md — EscrowCreate — beneficiary
      beneficiary: destination.type === 'beneficiary' ? destination.beneficiary : undefined,
      // Contract: docs/Backend_info/API_GUIDE (7).md — EscrowCreate — provider_user_id
      provider_user_id: providerUserId
    };

    try {
      const response = await createEscrow.mutateAsync(payload);
      setCreatedEscrow(response);
      setCreatedEscrowId(response.id);
      clearEscrowDraft();

      if (!hasMilestones) return;
      const milestonesPayload = milestoneDrafts.map((milestone) => ({
        ...milestone,
        // Contract: docs/Backend_info/API_GUIDE (7).md — MilestoneCreate — escrow_id
        escrow_id: response.id,
        // Contract: docs/Backend_info/API_GUIDE (7).md — MilestoneCreate — label
        label: milestone.label,
        // Contract: docs/Backend_info/API_GUIDE (7).md — MilestoneCreate — amount
        amount: milestone.amount,
        // Contract: docs/Backend_info/API_GUIDE (7).md — MilestoneCreate — currency
        currency: milestone.currency,
        // Contract: docs/Backend_info/API_GUIDE (7).md — MilestoneCreate — sequence_index
        sequence_index: milestone.sequence_index
      }));
      await createEscrowMilestones.mutateAsync({ escrowId: response.id, milestones: milestonesPayload });
    } catch (error) {
      setMilestoneCreationError(extractErrorMessage(error));
    }
  };

  const handleSaveDraft = () => {
    const draftProviderId = destination?.type === 'provider' ? Number(destination.provider_user_id) : null;
    const draftPayload: EscrowDraftPrefill['payload'] = {
      amount_total: amountTotal,
      currency,
      deadline_at: deadlineAt ? new Date(deadlineAt).toISOString() : undefined,
      provider_user_id:
        destination?.type === 'provider' && typeof draftProviderId === 'number' && Number.isFinite(draftProviderId)
          ? draftProviderId
          : undefined,
      beneficiary: destination?.type === 'beneficiary' ? destination.beneficiary : undefined,
      release_conditions: {
        requires_proof: requiresProof,
        milestones: milestoneDrafts.map((milestone) => ({
          label: milestone.label,
          idx: milestone.sequence_index
        }))
      }
    };
    const draft = createLocalEscrowDraft(draftPayload);

    const storedDraft = getEscrowDraft();
    if (!storedDraft || JSON.stringify(storedDraft) !== JSON.stringify(draft)) {
      clearEscrowDraft();
      setEscrowDraft(draft);
    }
    setDraftInfo(draft);
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Créer un escrow</h1>
        <p className="text-sm text-slate-600">
          Configurez un escrow et ajoutez les milestones requises pour libérer les fonds.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Escrow principal</h2>
            <p className="text-sm text-slate-500">Paramètres de l’escrow principal.</p>
          </div>
          {draftInfo ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Brouillon chargé depuis {draftInfo.source === 'mandate' ? 'le mandat' : 'le navigateur'}.
            </div>
          ) : null}
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <LabeledInput
            label="Montant total"
            value={amountTotal}
            onChange={(event) => setAmountTotal(event.target.value)}
            type="number"
          />
          <LabeledInput
            label="Devise"
            value={currency}
            onChange={(event) => setCurrency(event.target.value.toUpperCase())}
          />
          <LabeledInput
            label="Date limite"
            type="datetime-local"
            value={deadlineAt}
            onChange={(event) => setDeadlineAt(event.target.value)}
          />
          <LabeledInput
            label="Domaine"
            value={domain}
            onChange={(event) => setDomain(event.target.value as 'private' | 'public' | 'aid')}
          />
          <div className="flex items-center gap-2">
            <input
              id="requires-proof"
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-200"
              checked={requiresProof}
              onChange={(event) => setRequiresProof(event.target.checked)}
            />
            <label htmlFor="requires-proof" className="text-sm text-slate-600">
              Requiert une preuve
            </label>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Destinataire</CardTitle>
          <p className="text-sm text-slate-600">Choisissez le prestataire ou bénéficiaire de l’escrow.</p>
        </CardHeader>
        <CardContent>
          <EscrowDestinationSelector destination={destination} onChange={setDestination} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Milestones</CardTitle>
          <p className="text-sm text-slate-600">Définissez les étapes pour libérer les fonds.</p>
        </CardHeader>
        <CardContent>
          <MilestonesEditor
            currency={currency}
            milestones={milestoneDrafts}
            onChange={setMilestoneDrafts}
          />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button onClick={handleSaveDraft} variant="outline">
          Sauvegarder le brouillon
        </Button>
        <Button onClick={resetDraft} variant="secondary">
          Réinitialiser
        </Button>
      </div>

      {errorMessage ? <ErrorAlert message={errorMessage} /> : null}
      {milestoneCreationError ? <ErrorAlert message={milestoneCreationError} /> : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button onClick={handleSubmit} disabled={createEscrow.isPending}>
          {createEscrow.isPending ? 'Création en cours...' : 'Créer l’escrow'}
        </Button>
        {createdEscrow ? (
          <Button variant="outline" onClick={() => router.push(`/sender/escrows/${createdEscrow.id}`)}>
            Voir l’escrow
          </Button>
        ) : null}
      </div>

      {createdMilestonesQuery.data?.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Milestones créées</CardTitle>
            <p className="text-sm text-slate-600">Résumé des milestones créées pour cet escrow.</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {createdMilestonesQuery.data.map((milestone) => (
                <div key={milestone.id} className="rounded-md border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-800">{milestone.label}</p>
                  <p className="text-xs text-slate-500">
                    {milestone.amount} {milestone.currency} · Statut: {milestone.status}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function LabeledInput({ label, ...props }: { label: string } & InputProps) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-slate-700">{label}</label>
      <Input {...props} />
    </div>
  );
}
