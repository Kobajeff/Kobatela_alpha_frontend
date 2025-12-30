'use client';

// Small form allowing a sender to attach a new proof to an escrow and optionally a milestone.
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import Image from 'next/image';
import { useCreateProof } from '@/lib/queries/sender';
import { uploadProofFile } from '@/lib/apiClient';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { isDemoMode } from '@/lib/config';
import type { ProofFileUploadResponse, ProofType } from '@/types/api';
import { normalizeApiError } from '@/lib/apiError';
import type { EscrowSummaryViewer } from '@/lib/queryKeys';

interface ProofFormProps {
  escrowId: string;
  milestoneIdx?: number;
  milestoneRequired?: boolean;
  viewer?: EscrowSummaryViewer;
  onProofCreated?: (proofId: string) => void;
}

export function ProofForm({
  escrowId,
  milestoneIdx,
  milestoneRequired = true,
  viewer = 'sender',
  onProofCreated
}: ProofFormProps) {
  const [note, setNote] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [proofType, setProofType] = useState<ProofType>('PHOTO');
  const createProof = useCreateProof({ viewer });
  const { showToast } = useToast();

  const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
  const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Only JPEG/PNG images or PDF files are allowed.';
    }
    if (file.type.startsWith('image/') && file.size > MAX_IMAGE_SIZE_BYTES) {
      return 'Maximum size is 5 MB for images and 10 MB for PDFs.';
    }
    if (file.type === 'application/pdf' && file.size > MAX_PDF_SIZE_BYTES) {
      return 'Maximum size is 5 MB for images and 10 MB for PDFs.';
    }
    return null;
  };

  useEffect(() => {
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      const objectUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(objectUrl);
      return () => {
        URL.revokeObjectURL(objectUrl);
        setPreviewUrl(null);
      };
    }
    setPreviewUrl(null);
    return undefined;
  }, [selectedFile]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setFileError(null);
    setUploadProgress(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const validationMessage = validateFile(file);
    if (validationMessage) {
      setFileError(validationMessage);
      setSelectedFile(null);
      event.target.value = '';
      setFileInputKey((key) => key + 1);
      return;
    }

    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      setProofType('PHOTO');
    } else {
      setProofType('DOCUMENT');
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setUploadProgress(null);
    setFileError(null);
    setFileInputKey((key) => key + 1);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setFileError(null);
    if (milestoneRequired && (milestoneIdx === undefined || milestoneIdx === null)) {
      setErrorMessage('Sélectionnez un jalon avant de soumettre la preuve.');
      return;
    }

    if (!selectedFile) {
      setErrorMessage('Ajoutez un fichier pour soumettre la preuve.');
      return;
    }

    if (selectedFile) {
      const validationError = validateFile(selectedFile);
      if (validationError) {
        setFileError(validationError);
        return;
      }
    }

    setIsUploading(true);

    try {
      const basePayload = {
        escrow_id: escrowId,
        milestone_idx: milestoneIdx as number,
        type: proofType
      };

      let uploadResponse: ProofFileUploadResponse;

      if (selectedFile) {
        const validationMessage = validateFile(selectedFile);
        if (validationMessage) {
          setFileError(validationMessage);
          return;
        }

        setUploadProgress(0);

        if (isDemoMode()) {
          await new Promise((resolve) => {
            setUploadProgress(0);
            setTimeout(() => setUploadProgress(40), 150);
            setTimeout(() => setUploadProgress(80), 300);
            setTimeout(() => setUploadProgress(100), 450);
            setTimeout(resolve, 500);
          });

          uploadResponse = {
            file_id: 'demo-file-id',
            storage_key: 'proofs/demo-proof.pdf',
            storage_url: 'https://demo.kobatela.com/files/demo-proof.pdf',
            sha256: 'demo-sha256',
            content_type: selectedFile.type,
            size_bytes: selectedFile.size,
            escrow_id: escrowId,
            uploaded_by_role: viewer,
            uploaded_by_user_id: 'demo-user',
            bound: false
          };
        } else {
          uploadResponse = await uploadProofFile(selectedFile, escrowId, (percent) => {
            setUploadProgress(percent);
          });
        }

        setUploadProgress(100);
      }

      const createdProof = await createProof.mutateAsync({
        ...basePayload,
        storage_key: uploadResponse.storage_key,
        storage_url: uploadResponse.storage_url,
        sha256: uploadResponse.sha256,
        metadata: note ? { note } : undefined
      });
      const proofId = createdProof.id ?? createdProof.proof_id;
      if (proofId) {
        onProofCreated?.(String(proofId));
      }
      setNote('');
      setSelectedFile(null);
      setFileInputKey((key) => key + 1);
      setUploadProgress(null);
      setFileError(null);
      showToast('Proof created successfully', 'success');
    } catch (error) {
      const normalized = normalizeApiError(error);
      const message =
        normalized.status === 401
          ? 'Session expirée. Veuillez vous reconnecter.'
          : normalized.status === 403
            ? 'Accès refusé : vous ne pouvez pas soumettre de preuve.'
            : normalized.message;
      setErrorMessage(message);
      showToast(message, 'error');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const milestoneMissing =
    Boolean(milestoneRequired) && (milestoneIdx === undefined || milestoneIdx === null);
  const isSubmitting = createProof.isPending || isUploading;

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <label className="block text-sm font-medium text-slate-700">Note (optionnelle)</label>
        <textarea
          className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Ajoutez un contexte ou une précision"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Type de preuve</label>
        <select
          className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm"
          value={proofType}
          onChange={(event) => setProofType(event.target.value as ProofType)}
        >
          <option value="PHOTO">Photo</option>
          <option value="DOCUMENT">Document</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Proof file (photo or PDF)</label>
        <Input
          key={fileInputKey}
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          onChange={handleFileChange}
        />
        <p className="mt-1 text-xs text-slate-500">JPEG/PNG up to 5 MB, PDF up to 10 MB.</p>
        <p className="mt-1 text-xs text-slate-400">
          Your proof may be automatically analyzed by our AI assistant to help detect fraud. Final
          decisions are always made by a human reviewer.
        </p>
        {fileError && <p className="mt-1 text-xs text-rose-600">{fileError}</p>}
        {selectedFile ? (
          <div className="mt-2 rounded border border-dashed p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="font-medium">{selectedFile.name}</div>
                <div className="text-xs text-muted-foreground">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {selectedFile.type}
                </div>
              </div>
              <Button variant="outline" size="sm" type="button" onClick={handleClearFile}>
                Remove
              </Button>
            </div>
            {selectedFile.type.startsWith('image/') && previewUrl && (
              <div className="mt-2">
                <div className="relative h-24 max-w-full">
                  <Image
                    src={previewUrl}
                    alt="Selected file preview"
                    fill
                    unoptimized
                    sizes="100vw"
                    className="rounded object-cover"
                  />
                </div>
              </div>
            )}
            {selectedFile.type === 'application/pdf' && (
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <span>📄</span>
                <span>PDF preview is not shown here</span>
              </div>
            )}
            {uploadProgress !== null && (
              <div className="mt-2">
                <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-1.5 w-full rounded bg-gray-200">
                  <div
                    className="h-1.5 rounded bg-blue-500 transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-2 text-xs text-slate-600">
            Accepted formats: JPEG, PNG, PDF. Max 5 MB for images, 10 MB for documents.
          </p>
        )}
      </div>
      <div className="flex items-center justify-between">
        <div className="text-sm">
          {milestoneMissing && (
            <p className="text-amber-700">Sélectionnez un jalon pour continuer.</p>
          )}
          {errorMessage && <p className="text-rose-600">{errorMessage}</p>}
        </div>
        <Button type="submit" disabled={isSubmitting || milestoneMissing}>
          {isSubmitting ? 'Submitting proof…' : 'Ajouter une preuve'}
        </Button>
      </div>
    </form>
  );
}
