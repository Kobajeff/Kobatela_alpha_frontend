'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { extractErrorMessage } from '@/lib/apiClient';
import { useCreateEscrow } from '@/lib/queries/sender';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ErrorAlert } from '@/components/common/ErrorAlert';

const DEFAULT_CURRENCY = 'EUR';

export default function SenderCreateEscrowPage() {
  const router = useRouter();
  const createEscrow = useCreateEscrow();
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [description, setDescription] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Veuillez saisir un montant valide.');
      return;
    }

    const normalizedCurrency = currency.trim().toUpperCase() || DEFAULT_CURRENCY;

    try {
      const created = await createEscrow.mutateAsync({
        amount: parsedAmount,
        currency: normalizedCurrency,
        description: description.trim() || undefined
      });
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
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {errorMessage && <ErrorAlert message={errorMessage} />}
            <div>
              <label className="block text-sm font-medium text-slate-700">Montant</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
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
            <div>
              <label className="block text-sm font-medium text-slate-700">Description (optionnel)</label>
              <textarea
                className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Ajoutez des précisions sur la prestation ou les conditions"
              />
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
