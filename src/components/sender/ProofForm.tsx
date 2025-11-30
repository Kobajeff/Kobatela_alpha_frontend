'use client';

// Small form allowing a sender to attach a new proof to an escrow and optionally a milestone.
import { FormEvent, useState } from 'react';
import { useCreateProof } from '@/lib/queries/sender';
import { extractErrorMessage } from '@/lib/apiClient';

interface ProofFormProps {
  escrowId: string;
  milestoneId?: string;
}

export function ProofForm({ escrowId, milestoneId }: ProofFormProps) {
  const [description, setDescription] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const createProof = useCreateProof();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await createProof.mutateAsync({
        escrow_id: escrowId,
        milestone_id: milestoneId || undefined,
        description: description || undefined,
        attachment_url: attachmentUrl || undefined
      });
      setDescription('');
      setAttachmentUrl('');
      setSuccessMessage('Preuve ajoutée avec succès.');
    } catch (error) {
      setErrorMessage(extractErrorMessage(error));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <label className="block text-sm font-medium text-slate-700">Description</label>
        <textarea
          className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm"
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Décrivez la preuve fournie"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Lien de pièce jointe</label>
        <input
          className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm"
          value={attachmentUrl}
          onChange={(event) => setAttachmentUrl(event.target.value)}
          placeholder="https://exemple.com/preuve"
        />
      </div>
      <div className="flex items-center justify-between">
        <div className="text-sm">
          {errorMessage && <p className="text-rose-600">{errorMessage}</p>}
          {successMessage && <p className="text-emerald-600">{successMessage}</p>}
        </div>
        <button
          type="submit"
          disabled={createProof.isPending}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          Ajouter une preuve
        </button>
      </div>
    </form>
  );
}
