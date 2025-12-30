'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { normalizeApiError } from '@/lib/apiError';
import {
  fetchExternalEscrowSummary,
  submitExternalProof,
  uploadExternalProofFile
} from '@/lib/externalProofs';
import type { ExternalEscrowSummary, ExternalProofSubmitResponse } from '@/types/api';

export default function ExternalProofUploadPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? '';
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<ExternalProofSubmitResponse | null>(null);
  const [uploadMetadata, setUploadMetadata] = useState<{
    storage_key: string;
    storage_url: string;
    sha256: string;
    escrow_id: string | number;
    milestone_idx: number;
  } | null>(null);
  const [escrowSummary, setEscrowSummary] = useState<ExternalEscrowSummary | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!uploadMetadata?.escrow_id || !token) return;
    const loadSummary = async () => {
      try {
        const summary = await fetchExternalEscrowSummary(token, uploadMetadata.escrow_id);
        setEscrowSummary(summary);
      } catch (error) {
        setUploadError(normalizeApiError(error).message);
      }
    };
    void loadSummary();
  }, [token, uploadMetadata?.escrow_id]);

  const handleUpload = async () => {
    if (!selectedFile || !token) return;
    setUploadError(null);
    setSubmitError(null);
    setSubmitResult(null);
    setIsUploading(true);
    setUploadProgress(0);
    try {
      const response = await uploadExternalProofFile(token, selectedFile, (percent) => {
        setUploadProgress(percent);
      });
      setUploadMetadata({
        storage_key: response.storage_key,
        storage_url: response.storage_url,
        sha256: response.sha256,
        escrow_id: response.escrow_id,
        milestone_idx: response.milestone_idx
      });
    } catch (error) {
      setUploadError(normalizeApiError(error).message);
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const handleSubmit = async () => {
    if (!uploadMetadata || !token) return;
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const response = await submitExternalProof(token, {
        escrow_id: uploadMetadata.escrow_id,
        milestone_idx: uploadMetadata.milestone_idx,
        type: selectedFile?.type.startsWith('image/') ? 'PHOTO' : 'DOCUMENT',
        storage_key: uploadMetadata.storage_key,
        storage_url: uploadMetadata.storage_url,
        sha256: uploadMetadata.sha256
      });
      setSubmitResult(response);
    } catch (error) {
      setSubmitError(normalizeApiError(error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Dépôt de preuve</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              Cette page est réservée aux bénéficiaires externes. Le lien est sécurisé par jeton et
              ne permet pas d'accéder à d'autres escrows.
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-700">Fichier</label>
              <Input
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              />
            </div>
            {uploadProgress !== null && (
              <div className="text-xs text-slate-600">Téléversement… {uploadProgress}%</div>
            )}
            {uploadError && <p className="text-sm text-rose-600">{uploadError}</p>}
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleUpload} disabled={!selectedFile || isUploading}>
                {isUploading ? 'Téléversement…' : 'Téléverser la preuve'}
              </Button>
              <Button
                variant="secondary"
                onClick={handleSubmit}
                disabled={!uploadMetadata || isSubmitting}
              >
                {isSubmitting ? 'Soumission…' : 'Soumettre la preuve'}
              </Button>
            </div>
            {submitError && <p className="text-sm text-rose-600">{submitError}</p>}
            {submitResult && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                Preuve soumise avec succès. Statut : {submitResult.status}.
              </div>
            )}
          </CardContent>
        </Card>

        {escrowSummary && (
          <Card>
            <CardHeader>
              <CardTitle>Résumé de l'escrow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-600">
              <div>Escrow: {escrowSummary.escrow_id}</div>
              <div>Statut: {escrowSummary.status}</div>
              {escrowSummary.milestones?.length > 0 && (
                <div className="space-y-1">
                  {escrowSummary.milestones.map((milestone) => (
                    <div key={milestone.milestone_idx} className="rounded border border-slate-100 p-2">
                      <div>Jalon #{milestone.milestone_idx}</div>
                      <div>{milestone.label ?? 'Sans libellé'}</div>
                      <div>Statut: {milestone.status ?? '—'}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
