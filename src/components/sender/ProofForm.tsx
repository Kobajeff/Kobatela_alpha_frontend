'use client';

// Small form allowing a sender to attach a new proof to an escrow and optionally a milestone.
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { useCreateProof } from '@/lib/queries/sender';
import { extractErrorMessage, uploadProofFile } from '@/lib/apiClient';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { isDemoMode } from '@/lib/config';
import type { ProofFileUploadResponse } from '@/types/api';

interface ProofFormProps {
  escrowId: string;
  milestoneId?: string;
}

export function ProofForm({ escrowId, milestoneId }: ProofFormProps) {
  const [description, setDescription] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const createProof = useCreateProof();
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
    const trimmedAttachmentUrl = attachmentUrl.trim();

    if (!selectedFile && !trimmedAttachmentUrl) {
      setErrorMessage('Ajoutez un fichier ou fournissez un lien vers la preuve.');
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
        milestone_id: milestoneId || undefined,
        description: description || undefined
      };

      let payloadWithAttachment: typeof basePayload & {
        file_id?: string;
        attachment_url?: string;
      } = { ...basePayload };

      if (selectedFile) {
        const validationMessage = validateFile(selectedFile);
        if (validationMessage) {
          setFileError(validationMessage);
          return;
        }

        setUploadProgress(0);
        let uploadResponse: ProofFileUploadResponse;

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
            file_url: 'https://demo.kobatela.com/files/demo-proof.pdf'
          };
        } else {
          uploadResponse = await uploadProofFile(selectedFile, (percent) => {
            setUploadProgress(percent);
          });
        }

        setUploadProgress(100);

        payloadWithAttachment = {
          ...basePayload,
          file_id: uploadResponse.file_id,
          attachment_url: uploadResponse.file_url ?? undefined
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
      setUploadProgress(null);
      setFileError(null);
      showToast('Proof created successfully', 'success');
    } catch (error) {
      const message = extractErrorMessage(error);
      setErrorMessage(message);
      showToast(message, 'error');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
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
                <img
                  src={previewUrl}
                  alt="Selected file preview"
                  className="h-24 max-w-full rounded object-cover"
                />
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
          {isSubmitting ? 'Submitting proof…' : 'Ajouter une preuve'}
        </Button>
      </div>
    </form>
  );
}
