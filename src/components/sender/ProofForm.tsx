'use client';

// Small form allowing a sender to attach a new proof to an escrow and optionally a milestone.
import { FormEvent, useState } from 'react';
import { useCreateProof } from '@/lib/queries/sender';
import { extractErrorMessage } from '@/lib/apiClient';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';

interface ProofFormProps {
  escrowId: string;
  milestoneId?: string;
}

export function ProofForm({ escrowId, milestoneId }: ProofFormProps) {
  const [description, setDescription] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const createProof = useCreateProof();
  const { showToast } = useToast();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');

    try {
      await createProof.mutateAsync({
        escrow_id: escrowId,
        milestone_id: milestoneId || undefined,
        description: description || undefined,
        attachment_url: attachmentUrl || undefined
      });
      setDescription('');
      setAttachmentUrl('');
      showToast('Proof created successfully', 'success');
    } catch (error) {
      const message = extractErrorMessage(error);
      setErrorMessage(message);
      showToast(message, 'error');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <label className="block text-sm font-medium text-slate-700">Description</label>
        <textarea
          className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Décrivez la preuve fournie"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Lien de pièce jointe</label>
        <Input
          value={attachmentUrl}
          onChange={(event) => setAttachmentUrl(event.target.value)}
          placeholder="https://exemple.com/preuve"
        />
      </div>
      <div className="flex items-center justify-between">
        <div className="text-sm">
          {errorMessage && <p className="text-rose-600">{errorMessage}</p>}
        </div>
        <Button type="submit" disabled={createProof.isPending}>
          Ajouter une preuve
        </Button>
      </div>
    </form>
  );
}
