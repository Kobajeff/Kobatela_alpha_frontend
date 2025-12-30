import { useEffect, useState } from 'react';
import type { MilestoneCreatePayload } from '@/types/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ErrorAlert } from '@/components/common/ErrorAlert';

type MilestonesEditorProps = {
  milestones: MilestoneCreatePayload[];
  onChange: (next: MilestoneCreatePayload[]) => void;
  disabledReason?: string;
};

const DEFAULT_CURRENCY = 'EUR';

export function MilestonesEditor({ milestones, onChange, disabledReason }: MilestonesEditorProps) {
  const [enabled, setEnabled] = useState(milestones.length > 0);
  const [localMilestones, setLocalMilestones] = useState<MilestoneCreatePayload[]>(() =>
    milestones.length > 0
      ? milestones
      : [
          {
            // Contract: docs/Backend_info/API_GUIDE (6).md — MilestoneCreate — label
            label: '',
            // Contract: docs/Backend_info/API_GUIDE (6).md — MilestoneCreate — amount
            amount: '',
            // Contract: docs/Backend_info/API_GUIDE (6).md — MilestoneCreate — currency
            currency: DEFAULT_CURRENCY,
            // Contract: docs/Backend_info/API_GUIDE (6).md — MilestoneCreate — sequence_index
            sequence_index: 1
          }
        ]
  );
  const [error, setError] = useState<string | null>(null);

  const isDisabled = Boolean(disabledReason);

  useEffect(() => {
    setEnabled(milestones.length > 0);
    setLocalMilestones((prev) => {
      if (milestones.length === 0) return prev;
      return milestones;
    });
  }, [milestones]);

  useEffect(() => {
    if (!enabled) {
      onChange([]);
      return;
    }
    onChange(localMilestones);
  }, [enabled, localMilestones, onChange]);

  const handleToggle = (checked: boolean) => {
    setError(null);
    setEnabled(checked);
    if (checked && localMilestones.length === 0) {
      setLocalMilestones([
        {
          // Contract: docs/Backend_info/API_GUIDE (6).md — MilestoneCreate — label
          label: '',
          // Contract: docs/Backend_info/API_GUIDE (6).md — MilestoneCreate — amount
          amount: '',
          // Contract: docs/Backend_info/API_GUIDE (6).md — MilestoneCreate — currency
          currency: DEFAULT_CURRENCY,
          // Contract: docs/Backend_info/API_GUIDE (6).md — MilestoneCreate — sequence_index
          sequence_index: 1
        }
      ]);
    }
  };

  const updateMilestone = (idx: number, patch: Partial<MilestoneCreatePayload>) => {
    setError(null);
    setLocalMilestones((prev) =>
      prev.map((milestone, position) => (position === idx ? { ...milestone, ...patch } : milestone))
    );
  };

  const addMilestone = () => {
    setError(null);
    const nextIndex = (localMilestones[localMilestones.length - 1]?.sequence_index ?? localMilestones.length) + 1;
    setLocalMilestones((prev) => [
      ...prev,
      {
        // Contract: docs/Backend_info/API_GUIDE (6).md — MilestoneCreate — label
        label: '',
        // Contract: docs/Backend_info/API_GUIDE (6).md — MilestoneCreate — amount
        amount: '',
        // Contract: docs/Backend_info/API_GUIDE (6).md — MilestoneCreate — currency
        currency: DEFAULT_CURRENCY,
        // Contract: docs/Backend_info/API_GUIDE (6).md — MilestoneCreate — sequence_index
        sequence_index: nextIndex
      }
    ]);
  };

  const removeMilestone = (sequenceIndex: number) => {
    setError(null);
    setLocalMilestones((prev) => prev.filter((milestone) => milestone.sequence_index !== sequenceIndex));
  };

  const validateDrafts = () => {
    const seenIndexes = new Set<number>();
    for (const milestone of localMilestones) {
      if (!milestone.label.trim()) {
        setError('Chaque milestone doit avoir un libellé.');
        return false;
      }
      const numericAmount = Number(milestone.amount);
      if (!milestone.amount || !Number.isFinite(numericAmount) || numericAmount <= 0) {
        setError('Chaque milestone doit avoir un montant positif.');
        return false;
      }
      if (!milestone.currency.trim()) {
        setError('Chaque milestone doit avoir une devise.');
        return false;
      }
      if (milestone.sequence_index <= 0 || seenIndexes.has(milestone.sequence_index)) {
        setError('Les index de milestones doivent être uniques et positifs.');
        return false;
      }
      seenIndexes.add(milestone.sequence_index);
    }
    setError(null);
    return true;
  };

  useEffect(() => {
    if (enabled) {
      validateDrafts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, localMilestones]);

  return (
    <div className="space-y-3 rounded-md border border-slate-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => handleToggle(event.target.checked)}
            disabled={isDisabled}
          />
          Ajouter des milestones
        </label>
        {isDisabled && (
          <span className="text-xs text-amber-700">
            {disabledReason ?? 'Milestones non disponibles (contrat backend indisponible).'}
          </span>
        )}
      </div>

      {error && <ErrorAlert message={error} />}

      {enabled && !isDisabled && (
        <div className="space-y-3">
          {localMilestones.map((milestone, index) => (
            <div key={milestone.sequence_index} className="rounded-md border border-slate-100 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-800">Milestone #{milestone.sequence_index}</p>
                {localMilestones.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeMilestone(milestone.sequence_index)}>
                    Supprimer
                  </Button>
                )}
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Libellé</label>
                  <Input
                    type="text"
                    value={milestone.label}
                    onChange={(event) => updateMilestone(index, { label: event.target.value })}
                    placeholder="Livraison initiale"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Index (ordre)</label>
                  <Input
                    type="number"
                    min="1"
                    value={milestone.sequence_index}
                    onChange={(event) =>
                      updateMilestone(index, { sequence_index: Number(event.target.value) || milestone.sequence_index })
                    }
                    required
                  />
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Montant</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={milestone.amount}
                    onChange={(event) => updateMilestone(index, { amount: event.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Devise</label>
                  <Input
                    type="text"
                    value={milestone.currency}
                    onChange={(event) => updateMilestone(index, { currency: event.target.value.toUpperCase() })}
                    placeholder={DEFAULT_CURRENCY}
                    required
                  />
                </div>
              </div>

              <div className="mt-3">
                <label className="block text-sm font-medium text-slate-700">Type de preuve (optionnel)</label>
                <Input
                  type="text"
                  value={milestone.proof_kind ?? ''}
                  onChange={(event) => updateMilestone(index, { proof_kind: event.target.value || undefined })}
                  placeholder="PHOTO / INVOICE / DOCUMENT"
                />
              </div>

              <p className="mt-2 text-xs text-slate-500">
                Les exigences de preuve détaillées ne sont pas éditables car le contrat backend ne les documente pas pour le
                flux expéditeur.
              </p>
            </div>
          ))}

          <Button type="button" variant="outline" onClick={addMilestone}>
            Ajouter un milestone
          </Button>
        </div>
      )}
    </div>
  );
}
