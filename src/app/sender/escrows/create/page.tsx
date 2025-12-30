'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { extractErrorMessage } from '@/lib/apiClient';
import { clearEscrowDraft, createEscrowDraftFromMandate, getEscrowDraft, type EscrowDraftPrefill } from '@/lib/prefill/escrowDraft';
import { useCreateEscrow, useMandate } from '@/lib/queries/sender';
import type {
  EscrowCreatePayload,
  EscrowReleaseConditions,
  MilestoneCreatePayload
} from '@/types/api';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { MilestonesEditor } from '@/components/sender/milestones/MilestonesEditor';

const DEFAULT_CURRENCY = 'EUR';
const DEFAULT_DOMAIN: 'private' = 'private';

type BeneficiaryForm = {
  full_name: string;
  email: string;
  phone_number: string;
  address_line1: string;
  address_country_code: string;
  bank_account: string;
  national_id_number?: string;
};

const emptyBeneficiary: BeneficiaryForm = {
  full_name: '',
  email: '',
  phone_number: '',
  address_line1: '',
  address_country_code: '',
  bank_account: ''
};

export default function SenderCreateEscrowPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromMandateId = searchParams.get('from_mandate');
  const shouldPrefillFromQuery = searchParams.get('prefill') === '1';
  const mandateQuery = useMandate(shouldPrefillFromQuery ? fromMandateId ?? undefined : undefined);

  const createEscrow = useCreateEscrow();
  const [amountTotal, setAmountTotal] = useState('');
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [deadlineAt, setDeadlineAt] = useState('');
  const [domain, setDomain] = useState<'private' | 'public' | 'aid'>(DEFAULT_DOMAIN);
  const [requiresProof, setRequiresProof] = useState(true);
  const [milestoneDrafts, setMilestoneDrafts] = useState<MilestoneCreatePayload[]>([]);
  const [participantMode, setParticipantMode] = useState<'provider' | 'beneficiary' | null>(null);
  const [providerUserId, setProviderUserId] = useState('');
  const [beneficiary, setBeneficiary] = useState<BeneficiaryForm>(emptyBeneficiary);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [draftInfo, setDraftInfo] = useState<EscrowDraftPrefill | null>(null);
  const [prefillApplied, setPrefillApplied] = useState(false);

  const applyDraft = (draft: EscrowDraftPrefill | null) => {
    if (!draft) return;
    const payload = draft.payload ?? {};
    if (typeof payload.amount_total === 'number' || typeof payload.amount_total === 'string') {
      // Contract: docs/Backend_info/API_GUIDE (6).md — EscrowCreate — amount_total
      setAmountTotal(String(payload.amount_total));
    }
    if (typeof payload.currency === 'string') {
      // Contract: docs/Backend_info/API_GUIDE (6).md — EscrowCreate — currency
      setCurrency(String(payload.currency).toUpperCase());
    }
    if (typeof payload.provider_user_id === 'number' || typeof payload.provider_user_id === 'string') {
      // Contract: docs/Backend_info/API_GUIDE (6).md — EscrowCreate — provider_user_id
      setParticipantMode('provider');
      setProviderUserId(String(payload.provider_user_id));
      setBeneficiary(emptyBeneficiary);
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

  const releaseConditions: EscrowReleaseConditions = useMemo(
    () => ({
      // Contract: docs/Backend_info/API_GUIDE (6).md — EscrowCreate — release_conditions.requires_proof
      requires_proof: requiresProof
    }),
    [requiresProof]
  );

  const resetDraft = () => {
    clearEscrowDraft();
    setDraftInfo(null);
    setAmountTotal('');
    setCurrency(DEFAULT_CURRENCY);
    setProviderUserId('');
    setParticipantMode(null);
    setBeneficiary(emptyBeneficiary);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    const normalizedAmount = amountTotal.trim();
    const parsedAmount = Number(normalizedAmount);
    if (!normalizedAmount || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Veuillez saisir un montant total valide.');
      return;
    }

    const normalizedCurrency = currency.trim().toUpperCase() || DEFAULT_CURRENCY;
    if (!deadlineAt) {
      setErrorMessage('La date limite est requise.');
      return;
    }
    const deadlineIso = new Date(deadlineAt).toISOString();

    if (!participantMode) {
      setErrorMessage('Sélectionnez un destinataire (prestataire ou bénéficiaire).');
      return;
    }

    const payload: EscrowCreatePayload = {
      // Contract: docs/Backend_info/API_GUIDE (6).md — EscrowCreate — amount_total
      amount_total: normalizedAmount,
      // Contract: docs/Backend_info/API_GUIDE (6).md — EscrowCreate — currency
      currency: normalizedCurrency,
      // Contract: docs/Backend_info/API_GUIDE (6).md — EscrowCreate — release_conditions
      release_conditions: releaseConditions,
      // Contract: docs/Backend_info/API_GUIDE (6).md — EscrowCreate — deadline_at
      deadline_at: deadlineIso,
      // Contract: docs/Backend_info/API_GUIDE (6).md — EscrowCreate — domain
      domain
    };

    if (participantMode === 'provider') {
      const parsedProviderId = Number(providerUserId);
      if (!providerUserId || !Number.isFinite(parsedProviderId) || parsedProviderId <= 0) {
        setErrorMessage('Identifiant prestataire invalide.');
        return;
      }
      payload.provider_user_id = parsedProviderId; // Contract: docs/Backend_info/API_GUIDE (6).md — EscrowCreate — provider_user_id
    } else {
      const { full_name, email, phone_number, address_line1, address_country_code, bank_account, national_id_number } =
        beneficiary;
      if (!full_name || !email || !phone_number || !address_line1 || !address_country_code || !bank_account) {
        setErrorMessage('Tous les champs bénéficiaire sont requis (sauf identifiant national).');
        return;
      }
      payload.beneficiary = {
        // Contract: docs/Backend_info/API_GUIDE (6).md — BeneficiaryCreate — full_name
        full_name,
        // Contract: docs/Backend_info/API_GUIDE (6).md — BeneficiaryCreate — email
        email,
        // Contract: docs/Backend_info/API_GUIDE (6).md — BeneficiaryCreate — phone_number
        phone_number,
        // Contract: docs/Backend_info/API_GUIDE (6).md — BeneficiaryCreate — address_line1
        address_line1,
        // Contract: docs/Backend_info/API_GUIDE (6).md — BeneficiaryCreate — address_country_code
        address_country_code,
        // Contract: docs/Backend_info/API_GUIDE (6).md — BeneficiaryCreate — bank_account
        bank_account,
        // Contract: docs/Backend_info/API_GUIDE (6).md — BeneficiaryCreate — national_id_number
        national_id_number: national_id_number?.trim() || undefined
      };
    }

    try {
      const created = await createEscrow.mutateAsync(payload);
      clearEscrowDraft();
      router.push(`/sender/escrows/${created.id}`);
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
                <Input
                  type="text"
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value)}
                  placeholder={DEFAULT_CURRENCY}
                  required
                />
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

            <div className="space-y-3 rounded-md border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-800">Destinataire</p>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="participant-mode"
                    value="provider"
                    checked={participantMode === 'provider'}
                    onChange={() => {
                      setParticipantMode('provider');
                      setBeneficiary(emptyBeneficiary);
                    }}
                  />
                  Prestataire sur la plateforme
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="participant-mode"
                    value="beneficiary"
                    checked={participantMode === 'beneficiary'}
                    onChange={() => {
                      setParticipantMode('beneficiary');
                      setProviderUserId('');
                    }}
                  />
                  Bénéficiaire hors plateforme
                </label>
              </div>

              {participantMode === 'provider' && (
                <div className="mt-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Identifiant utilisateur prestataire
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={providerUserId}
                    onChange={(event) => setProviderUserId(event.target.value)}
                    placeholder="ID utilisateur"
                    required
                  />
                </div>
              )}

              {participantMode === 'beneficiary' && (
                <div className="mt-2 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Nom complet</label>
                    <Input
                      type="text"
                      value={beneficiary.full_name}
                      onChange={(event) =>
                        setBeneficiary((prev) => ({ ...prev, full_name: event.target.value }))
                      }
                      placeholder="Nom et prénom"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Email</label>
                      <Input
                        type="email"
                        value={beneficiary.email}
                        onChange={(event) =>
                          setBeneficiary((prev) => ({ ...prev, email: event.target.value }))
                        }
                        placeholder="beneficiaire@example.com"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Téléphone</label>
                      <Input
                        type="tel"
                        value={beneficiary.phone_number}
                        onChange={(event) =>
                          setBeneficiary((prev) => ({ ...prev, phone_number: event.target.value }))
                        }
                        placeholder="+2507..."
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Adresse (ligne 1)</label>
                      <Input
                        type="text"
                        value={beneficiary.address_line1}
                        onChange={(event) =>
                          setBeneficiary((prev) => ({ ...prev, address_line1: event.target.value }))
                        }
                        placeholder="123 Rue Exemple"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Code pays (adresse)</label>
                      <Input
                        type="text"
                        value={beneficiary.address_country_code}
                        onChange={(event) =>
                          setBeneficiary((prev) => ({
                            ...prev,
                            address_country_code: event.target.value
                          }))
                        }
                        placeholder="FR"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Compte bancaire / IBAN</label>
                      <Input
                        type="text"
                        value={beneficiary.bank_account}
                        onChange={(event) =>
                          setBeneficiary((prev) => ({ ...prev, bank_account: event.target.value }))
                        }
                        placeholder="FR76..."
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">
                        Numéro d&apos;identité (optionnel)
                      </label>
                      <Input
                        type="text"
                        value={beneficiary.national_id_number ?? ''}
                        onChange={(event) =>
                          setBeneficiary((prev) => ({
                            ...prev,
                            national_id_number: event.target.value
                          }))
                        }
                        placeholder="ID national / passeport"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

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
                disabledReason="Création de milestones réservée aux rôles admin/support (POST /escrows/{id}/milestones)."
              />
              <p className="text-xs text-slate-600">
                Les milestones ne sont pas envoyées à la création d&apos;un escrow car le contrat backend limite la création
                aux rôles admin/support. La création expéditeur reste désactivée pour éviter les erreurs 403/422.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={createEscrow.isPending}>
                {createEscrow.isPending ? 'Création en cours...' : 'Créer l\'escrow'}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={createEscrow.isPending}
                onClick={() => router.push('/sender/escrows')}
              >
                Annuler
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
