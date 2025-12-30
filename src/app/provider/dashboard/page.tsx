'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function ProviderDashboardPage() {
  const router = useRouter();
  const [escrowId, setEscrowId] = useState('');

  const handleNavigate = () => {
    if (!escrowId.trim()) return;
    router.push(`/provider/escrows/${escrowId.trim()}`);
  };

  return (
    <div className="space-y-6 rounded-lg bg-white p-6 shadow">
      <div>
        <h1 className="text-2xl font-semibold">Espace prestataire</h1>
        <p className="text-slate-600">
          Accédez à un escrow pour déposer une preuve et suivre son statut.
        </p>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Escrow ID</label>
        <div className="flex flex-wrap gap-2">
          <Input
            value={escrowId}
            onChange={(event) => setEscrowId(event.target.value)}
            placeholder="ex: 1024"
            className="min-w-[220px]"
          />
          <Button onClick={handleNavigate} disabled={!escrowId.trim()}>
            Ouvrir l'escrow
          </Button>
        </div>
      </div>
    </div>
  );
}
