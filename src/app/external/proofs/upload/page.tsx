'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { getExternalTokenFromStorage, getExternalTokenFromUrl } from '@/lib/externalAuth';
import { useExternalProofSubmit, useExternalProofUpload } from '@/lib/queries/external';
import { mapExternalErrorMessage } from '@/lib/api/externalClient';

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
  const [escrowId, setEscrowId] = useState<string>('');

  const tokenFromUrl = useMemo(() => {
    if (!searchParams) return null;
    return getExternalTokenFromUrl(searchParams);
  }, [searchParams]);

  useEffect(() => {
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      return;
    }
    const stored = getExternalTokenFromStorage();
    if (stored) setToken(stored);
  }, [tokenFromUrl]);

  useEffect(() => {
    if (!searchParams) return;
    const param = searchParams.get('escrowId') ?? searchParams.get('escrow_id');
    if (param) setEscrowId(param);
  }, [searchParams]);

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
      if (response.escrow_id) {
        setEscrowId(String(response.escrow_id));
      }
    } catch (error) {
      setUploadError(mapExternalErrorMessage(error));
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
      const params = new URLSearchParams({ token });
      router.push(`/external/proofs/${response.proof_id}?${params.toString()}`);
    } catch (error) {
      setSubmitError(mapExternalErrorMessage(error));
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
                disabled={!selectedFile || uploadMutation.isPending}
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
                disabled={!uploadMetadata || submitMutation.isPending}
              >
                {submitMutation.isPending ? 'Soumission…' : 'Soumettre la preuve'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (!token || !escrowId) return;
                  const params = new URLSearchParams({ token, escrowId });
                  router.push(`/external/escrow?${params.toString()}`);
                }}
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
