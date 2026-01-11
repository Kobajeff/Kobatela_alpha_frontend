'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import {
  clearExternalToken,
  consumeExternalTokenFromQuery,
  getExternalToken,
  setExternalToken
} from '@/lib/external/externalSession';
import { useExternalProofSubmit, useExternalProofUpload } from '@/lib/queries/external';
import { mapExternalErrorMessage } from '@/lib/external/externalErrorMessages';
import { normalizeApiError } from '@/lib/apiError';
import { LoadingState } from '@/components/common/LoadingState';
import type { UIId } from '@/types/id';

function ExternalProofUploadPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [missingToken, setMissingToken] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadMetadata, setUploadMetadata] = useState<{
    storage_key: string;
    storage_url: string;
    sha256: string;
    escrow_id: UIId;
    milestone_idx: number;
    content_type?: string;
    size_bytes?: number;
    file_name?: string;
  } | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    const tokenFromQuery = consumeExternalTokenFromQuery(searchParams, {
      replacePath: '/external/proofs/upload'
    });
    if (tokenFromQuery) {
      setToken(tokenFromQuery);
      setMissingToken(false);
      return;
    }
    const stored = getExternalToken();
    if (stored) {
      setToken(stored);
      setMissingToken(false);
      return;
    }
    setMissingToken(true);
  }, [searchParams]);

  const uploadMutation = useExternalProofUpload(token);
  const submitMutation = useExternalProofSubmit(token);

  useEffect(() => {
    if (!token) {
      setUploadError('Lien requis pour déposer une preuve. Utilisez le lien transmis.');
    } else {
      setUploadError(null);
    }
  }, [token]);

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
        size_bytes: response.size_bytes,
        file_name: selectedFile.name
      });
    } catch (error) {
      setUploadError(mapExternalErrorMessage(error));
      const normalized = normalizeApiError(error);
      if (normalized.status === 401 || normalized.status === 403 || normalized.status === 410) {
        clearExternalToken();
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
      if (normalized.status === 401 || normalized.status === 403 || normalized.status === 410) {
        clearExternalToken();
      }
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Déposer une preuve</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-700">
          <p>
            Étape 3/5 : chargez le fichier demandé par l’expéditeur. Le lien reste limité à ce
            dossier.
          </p>
          {missingToken && (
            <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm">
              <p className="font-medium text-slate-800">
                Lien manquant : retournez à l’accueil et collez le jeton sécurisé pour continuer.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Button type="button" onClick={() => router.push('/external')} variant="secondary">
                  Retour à l’accueil
                </Button>
              </div>
            </div>
          )}
          <p className="text-xs text-slate-600">
            Formats acceptés : JPEG, PNG, PDF. Taille maximale : 5 Mo (images) ou 10 Mo (PDF).
          </p>
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-800">
              Fichier à déposer
              <span className="block text-xs font-normal text-slate-600">
                Le fichier doit correspondre au jalon indiqué dans votre lien.
              </span>
            </label>
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
              {uploadMutation.isPending ? 'Téléversement…' : 'Uploader le fichier'}
            </Button>
            {uploadError && <ErrorAlert message={uploadError} />}
          </div>
          {uploadMetadata && (
            <div className="space-y-2 rounded-md border border-slate-200 bg-white p-4 text-xs text-slate-700">
              <div className="font-semibold text-slate-900">Fichier prêt à être soumis</div>
              <div>Escrow: {uploadMetadata.escrow_id}</div>
              <div>Jalon: {uploadMetadata.milestone_idx}</div>
              <div>Nom du fichier: {uploadMetadata.file_name ?? '—'}</div>
              <div>Taille: {uploadMetadata.size_bytes ?? '—'} octets</div>
              <div className="pt-2 text-slate-800">Étape suivante : soumettre la preuve.</div>
            </div>
          )}

          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-800">
              Note pour l&apos;expéditeur (optionnel)
              <span className="block text-xs font-normal text-slate-600">
                Ajoutez des précisions pour faciliter la validation.
              </span>
            </label>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Ex: Détails complémentaires ou numéro de référence"
              rows={3}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
            <Button type="button" variant="secondary" onClick={() => router.push('/external/escrow')}>
              Retour au résumé
            </Button>
          </div>
          {submitError && <ErrorAlert message={submitError} />}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ExternalProofUploadPage() {
  return (
    <Suspense fallback={<LoadingState label="Chargement..." />}>
      <ExternalProofUploadPageContent />
    </Suspense>
  );
}
