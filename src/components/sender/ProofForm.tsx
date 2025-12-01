'use client';

// Small form allowing a sender to attach a new proof to an escrow and optionally a milestone.
import { FormEvent, useState } from 'react';
import { useCreateProof } from '@/lib/queries/sender';
import { extractErrorMessage, uploadProofFile } from '@/lib/apiClient';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { isDemoMode } from '@/lib/config';
import type { ProofFileUploadResponse, ProofType } from '@/types/api';

interface ProofFormProps {
  escrowId: string;
  milestoneId?: string;
}

export function ProofForm({ escrowId, milestoneId }: ProofFormProps) {
  const [description, setDescription] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const createProof = useCreateProof();
  const { showToast } = useToast();

  const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
  const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

  const validateFile = (file: File): string | null => {
    if (file.type.startsWith('image/') && file.size > MAX_IMAGE_SIZE_BYTES) {
      return 'La taille maximale pour une image est de 5 Mo.';
    }
    if (file.type === 'application/pdf' && file.size > MAX_PDF_SIZE_BYTES) {
      return 'La taille maximale pour un PDF est de 10 Mo.';
    }
    return null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    const trimmedAttachmentUrl = attachmentUrl.trim();

    if (!selectedFile && !trimmedAttachmentUrl) {
      setErrorMessage('Ajoutez un fichier ou fournissez un lien vers la preuve.');
      return;
    }

    if (selectedFile) {
      const validationError = validateFile(selectedFile);
      if (validationError) {
        setErrorMessage(validationError);
        return;
      }
    }

    setIsUploading(true);

    try {
      const basePayload = {
        escrow_id: escrowId,
        milestone_id: milestoneId || undefined,
        description: description || undefined
      };

      let payloadWithAttachment: typeof basePayload & {
        attachment_url?: string;
        storage_url?: string;
        sha256?: string;
        type?: ProofType;
        content_type?: string;
        size_bytes?: number;
      } = { ...basePayload };

      if (selectedFile) {
        let uploadResponse: ProofFileUploadResponse;

        if (isDemoMode()) {
          uploadResponse = {
            storage_url: 'https://example.com/demo-proof-file',
            sha256: 'demo-sha256',
            content_type: selectedFile.type || 'application/octet-stream',
            size_bytes: selectedFile.size
          };
        } else {
          uploadResponse = await uploadProofFile(selectedFile);
        }

        const contentType = uploadResponse.content_type || selectedFile.type || 'application/octet-stream';
        const type: ProofType = contentType.startsWith('image/') ? 'PHOTO' : 'DOCUMENT';

        payloadWithAttachment = {
          ...basePayload,
          type,
          storage_url: uploadResponse.storage_url,
          attachment_url: uploadResponse.storage_url,
          sha256: uploadResponse.sha256,
          content_type: contentType,
          size_bytes: uploadResponse.size_bytes
        };
      } else if (trimmedAttachmentUrl) {
        payloadWithAttachment = {
          ...basePayload,
          attachment_url: trimmedAttachmentUrl
        };
      }

      await createProof.mutateAsync(payloadWithAttachment);
      setDescription('');
      setAttachmentUrl('');
      setSelectedFile(null);
      setFileInputKey((key) => key + 1);
      showToast('Proof created successfully', 'success');
    } catch (error) {
      const message = extractErrorMessage(error);
      setErrorMessage(message);
      showToast(message, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const isSubmitting = createProof.isPending || isUploading;

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
        <label className="block text-sm font-medium text-slate-700">Fichier (photo ou PDF)</label>
        <Input
          key={fileInputKey}
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            setSelectedFile(file);
            setErrorMessage('');
          }}
        />
        <p className="mt-1 text-xs text-slate-500">Images jusqu'à 5 Mo, PDF jusqu'à 10 Mo.</p>
        {selectedFile && (
          <p className="mt-1 text-xs text-slate-600">Fichier sélectionné : {selectedFile.name}</p>
        )}
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
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Soumission de la preuve…' : 'Ajouter une preuve'}
        </Button>
      </div>
    </form>
  );
}
