'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import {
  clearExternalToken,
  getExternalToken,
  readTokenFromQuery,
  setExternalToken
} from '@/lib/external/externalSession';
import { useExternalProofSubmit, useExternalProofUpload } from '@/lib/queries/external';
import { mapExternalErrorMessage } from '@/lib/api/externalClient';
import { normalizeApiError } from '@/lib/apiError';

export default function ExternalProofUploadPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadMetadata, setUploadMetadata] = useState<{
    storage_key: string;
    storage_url: string;
    sha256: string;
    escrow_id: string | number;
    milestone_idx: number;
    content_type?: string;
    size_bytes?: number;
  } | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!searchParams) return;
    const tokenFromQuery = readTokenFromQuery(searchParams);
    if (tokenFromQuery) {
      setToken(tokenFromQuery);
      setExternalToken(tokenFromQuery);
      router.replace('/external/proofs/upload');
      return;
    }
    const stored = getExternalToken();
    if (stored) {
      setToken(stored);
    }
  }, [router, searchParams]);

  const uploadMutation = useExternalProofUpload(token);
  const submitMutation = useExternalProofSubmit(token);

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploadError(null);
    setSubmitError(null);
    setUploadMetadata(null);
    try {
      const response = await uploadMutation.mutateAsync({
        file: selectedFile,
        onProgress: () => {}
      });
      setUploadMetadata({
        storage_key: response.storage_key,
        storage_url: response.storage_url,
        sha256: response.sha256,
        escrow_id: response.escrow_id,
        milestone_idx: response.milestone_idx,
        content_type: response.content_type,
        size_bytes: response.size_bytes
      });
    } catch (error) {
      setUploadError(mapExternalErrorMessage(error));
      const normalized = normalizeApiError(error);
      if (normalized.status === 401) {
        clearExternalToken();
        router.replace('/external?error=invalid_token');
      }
    }
  };

  const handleSubmit = async () => {
    if (!uploadMetadata || !token) return;
    setSubmitError(null);
    try {
      const response = await submitMutation.mutateAsync({
        escrow_id: uploadMetadata.escrow_id,
        milestone_idx: uploadMetadata.milestone_idx,
        type: selectedFile?.type.startsWith('image/') ? 'PHOTO' : 'DOCUMENT',
        storage_key: uploadMetadata.storage_key,
        storage_url: uploadMetadata.storage_url,
        sha256: uploadMetadata.sha256,
        metadata: note ? { note } : undefined
      });
      router.push(`/external/proofs/${response.proof_id}`);
    } catch (error) {
      setSubmitError(mapExternalErrorMessage(error));
      const normalized = normalizeApiError(error);
      if (normalized.status === 401) {
        clearExternalToken();
        router.replace('/external?error=invalid_token');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Déposer une preuve</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-700">
            <p>
              Chargez un fichier conforme aux instructions de l&apos;expéditeur. Aucun jeton n’est
              exposé dans les journaux.
            </p>
            <p className="text-xs text-slate-600">
              Formats acceptés: JPEG, PNG, PDF. Taille maximale: 5 Mo (images) ou 10 Mo (PDF).
            </p>
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-800">Fichier</label>
              <Input
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              />
              <Button
                type="button"
                onClick={handleUpload}
                disabled={!selectedFile || uploadMutation.isPending || !token}
              >
                {uploadMutation.isPending ? 'Téléversement…' : 'Téléverser'}
              </Button>
              {uploadError && <ErrorAlert message={uploadError} />}
            </div>
            {uploadMetadata && (
              <div className="space-y-2 rounded-md border border-slate-200 bg-white p-4 text-xs text-slate-700">
                <div className="font-semibold text-slate-900">Fichier prêt à être soumis</div>
                <div>Escrow: {uploadMetadata.escrow_id}</div>
                <div>Jalon: {uploadMetadata.milestone_idx}</div>
                <div>Clé de stockage: {uploadMetadata.storage_key}</div>
                <div>Empreinte (sha256): {uploadMetadata.sha256}</div>
                <div>Taille: {uploadMetadata.size_bytes ?? '—'} octets</div>
              </div>
            )}

            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-800">
                Note pour l&apos;expéditeur (optionnel)
              </label>
              <Input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Ex: Détails complémentaires"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!uploadMetadata || submitMutation.isPending || !token}
              >
                {submitMutation.isPending ? 'Soumission…' : 'Soumettre la preuve'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push('/external/escrow')}
              >
                Retour au résumé
              </Button>
            </div>
            {submitError && <ErrorAlert message={submitError} />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
