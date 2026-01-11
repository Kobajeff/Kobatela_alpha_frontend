'use client';

import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { extractErrorMessage } from '@/lib/apiClient';
import { normalizeApiError } from '@/lib/apiError';
import { useUploadInflationCsv, useUploadReferenceCsv } from '@/lib/queries/pricingAdmin';
import { useAuthMe } from '@/lib/queries/sender';
import { userHasScope } from '@/lib/scopes';
import type { AuthUser } from '@/types/auth';

type UploadState = {
  file: File | null;
  success: string | null;
  error: string | null;
};

const panels = [
  {
    id: 'reference',
    title: 'Reference CSV import',
    description: 'POST /admin/pricing/reference/import-csv (pricing_admin scope)',
    actionLabel: 'Upload reference CSV'
  },
  {
    id: 'inflation',
    title: 'Inflation CSV upload',
    description: 'POST /admin/pricing/inflation/upload-csv (pricing_admin scope)',
    actionLabel: 'Upload inflation CSV'
  }
];

export default function AdminPricingReferenceImportPage() {
  const { data: user } = useAuthMe();
  const authUser = user as AuthUser | undefined;
  const hasPricingScope = userHasScope(authUser, 'pricing_admin');
  const referenceMutation = useUploadReferenceCsv();
  const inflationMutation = useUploadInflationCsv();
  const [states, setStates] = useState<Record<string, UploadState>>(() => {
    return panels.reduce(
      (acc, panel) => ({
        ...acc,
        [panel.id]: { file: null, success: null, error: null }
      }),
      {}
    );
  });

  const isPending = useMemo(
    () => referenceMutation.isPending || inflationMutation.isPending,
    [inflationMutation.isPending, referenceMutation.isPending]
  );

  const handleFileChange = (panelId: string, fileList: FileList | null) => {
    const file = fileList?.[0] ?? null;
    setStates((prev) => ({
      ...prev,
      [panelId]: { ...prev[panelId], file, success: null, error: null }
    }));
  };

  const handleUpload = async (panelId: string) => {
    if (!hasPricingScope) return;
    const entry = states[panelId];
    if (!entry?.file) {
      setStates((prev) => ({
        ...prev,
        [panelId]: { ...prev[panelId], error: 'Veuillez sélectionner un fichier CSV.' }
      }));
      return;
    }
    setStates((prev) => ({
      ...prev,
      [panelId]: { ...prev[panelId], success: null, error: null }
    }));
    try {
      if (panelId === 'reference') {
        await referenceMutation.mutateAsync(entry.file);
      } else {
        await inflationMutation.mutateAsync(entry.file);
      }
      setStates((prev) => ({
        ...prev,
        [panelId]: { file: null, success: 'Fichier importé avec succès.', error: null }
      }));
    } catch (error) {
      const normalized = normalizeApiError(error);
      const message =
        normalized.status === 403
          ? 'Accès refusé : scope pricing_admin requis.'
          : normalized.status === 422 || normalized.status === 409
          ? normalized.message
          : extractErrorMessage(error);
      setStates((prev) => ({
        ...prev,
        [panelId]: { ...prev[panelId], error: message }
      }));
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Pricing admin — CSV imports</h1>
        <p className="text-sm text-slate-600">
          Import reference pricing and inflation data. Use CSV files only
          ( <code className="rounded bg-slate-100 px-1 text-xs">accept=.csv</code> ).
        </p>
      </div>

      {!hasPricingScope && (
        <ErrorAlert message="Access denied (pricing_admin required). Your session is still valid." />
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {panels.map((panel) => {
          const state = states[panel.id];
          const mutationPending =
            panel.id === 'reference' ? referenceMutation.isPending : inflationMutation.isPending;
          const disabled = mutationPending || !hasPricingScope;
          return (
            <Card key={panel.id} className="space-y-4 p-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">{panel.title}</h2>
                <p className="text-sm text-slate-600">{panel.description}</p>
              </div>
              <div className="space-y-2">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(event) => handleFileChange(panel.id, event.target.files)}
                  className="block w-full text-sm"
                  disabled={isPending || !hasPricingScope}
                />
                <Button
                  type="button"
                  onClick={() => handleUpload(panel.id)}
                  disabled={disabled || !state?.file}
                >
                  {mutationPending ? 'Uploading...' : panel.actionLabel}
                </Button>
              </div>
              {state?.success && (
                <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                  {state.success}
                </div>
              )}
              {state?.error && <ErrorAlert message={state.error} />}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
