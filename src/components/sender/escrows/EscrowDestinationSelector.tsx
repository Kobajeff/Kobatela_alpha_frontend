'use client';

import { Input } from '@/components/ui/Input';
import type { BeneficiaryCreate, EscrowDestination } from '@/types/api';

const emptyBeneficiary: BeneficiaryCreate = {
  full_name: '',
  email: '',
  phone_number: '',
  address_line1: '',
  address_country_code: '',
  bank_account: ''
};

type Props = {
  destination: EscrowDestination | null;
  onChange: (destination: EscrowDestination | null) => void;
  disabled?: boolean;
};

export function EscrowDestinationSelector({ destination, onChange, disabled }: Props) {
  const handleProviderSelection = () => {
    onChange({ type: 'provider', provider_user_id: '' });
  };

  const handleBeneficiarySelection = () => {
    onChange({ type: 'beneficiary', beneficiary: emptyBeneficiary });
  };

  const handleBeneficiaryChange = <Field extends keyof BeneficiaryCreate>(field: Field, value: string) => {
    if (destination?.type !== 'beneficiary') return;
    onChange({
      type: 'beneficiary',
      beneficiary: {
        ...destination.beneficiary,
        [field]: value
      }
    });
  };

  return (
    <div className="space-y-3 rounded-md border border-slate-200 p-4">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-slate-800">Destinataire</p>
        <p className="text-xs text-slate-600">
          Prestataire = utilisateur Kobatela existant. Bénéficiaire = contact hors plateforme avec accès limité via lien.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="radio"
            name="destination-mode"
            value="provider"
            checked={destination?.type === 'provider'}
            onChange={handleProviderSelection}
            disabled={disabled}
          />
          Prestataire (utilisateur Kobatela)
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="radio"
            name="destination-mode"
            value="beneficiary"
            checked={destination?.type === 'beneficiary'}
            onChange={handleBeneficiarySelection}
            disabled={disabled}
          />
          Bénéficiaire (hors plateforme)
        </label>
      </div>

      {destination?.type === 'provider' && (
        <div className="mt-2 space-y-2">
          <label className="block text-sm font-medium text-slate-700">
            Identifiant utilisateur prestataire
          </label>
          <Input
            type="number"
            min="1"
            value={destination.provider_user_id}
            onChange={(event) =>
              onChange({
                type: 'provider',
                // Contract: docs/Backend_info/API_GUIDE (7).md — EscrowCreate — provider_user_id
                provider_user_id: event.target.value
              })
            }
            placeholder="ID utilisateur"
            required
            disabled={disabled}
          />
        </div>
      )}

      {destination?.type === 'beneficiary' && (
        <div className="mt-2 space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700">Nom complet</label>
            <Input
              type="text"
              value={destination.beneficiary.full_name}
              onChange={(event) =>
                handleBeneficiaryChange(
                  // Contract: docs/Backend_info/API_GUIDE (7).md — BeneficiaryCreate — full_name
                  'full_name',
                  event.target.value
                )
              }
              placeholder="Nom et prénom"
              required
              disabled={disabled}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <Input
                type="email"
                value={destination.beneficiary.email}
                onChange={(event) =>
                  handleBeneficiaryChange(
                    // Contract: docs/Backend_info/API_GUIDE (7).md — BeneficiaryCreate — email
                    'email',
                    event.target.value
                  )
                }
                placeholder="beneficiaire@example.com"
                required
                disabled={disabled}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Téléphone</label>
              <Input
                type="tel"
                value={destination.beneficiary.phone_number}
                onChange={(event) =>
                  handleBeneficiaryChange(
                    // Contract: docs/Backend_info/API_GUIDE (7).md — BeneficiaryCreate — phone_number
                    'phone_number',
                    event.target.value
                  )
                }
                placeholder="+2507..."
                required
                disabled={disabled}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Adresse (ligne 1)</label>
              <Input
                type="text"
                value={destination.beneficiary.address_line1}
                onChange={(event) =>
                  handleBeneficiaryChange(
                    // Contract: docs/Backend_info/API_GUIDE (7).md — BeneficiaryCreate — address_line1
                    'address_line1',
                    event.target.value
                  )
                }
                placeholder="123 Rue Exemple"
                required
                disabled={disabled}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Code pays (adresse)</label>
              <Input
                type="text"
                value={destination.beneficiary.address_country_code}
                onChange={(event) =>
                  handleBeneficiaryChange(
                    // Contract: docs/Backend_info/API_GUIDE (7).md — BeneficiaryCreate — address_country_code
                    'address_country_code',
                    event.target.value
                  )
                }
                placeholder="FR"
                required
                disabled={disabled}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Compte bancaire / IBAN</label>
              <Input
                type="text"
                value={destination.beneficiary.bank_account}
                onChange={(event) =>
                  handleBeneficiaryChange(
                    // Contract: docs/Backend_info/API_GUIDE (7).md — BeneficiaryCreate — bank_account
                    'bank_account',
                    event.target.value
                  )
                }
                placeholder="FR76..."
                required
                disabled={disabled}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Numéro d&apos;identité (optionnel)</label>
              <Input
                type="text"
                value={destination.beneficiary.national_id_number ?? ''}
                onChange={(event) =>
                  handleBeneficiaryChange(
                    // Contract: docs/Backend_info/API_GUIDE (7).md — BeneficiaryCreate — national_id_number
                    'national_id_number',
                    event.target.value
                  )
                }
                placeholder="ID national / passeport"
                disabled={disabled}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
