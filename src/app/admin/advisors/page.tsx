'use client';

import { ErrorAlert } from '@/components/common/ErrorAlert';
import { LoadingState } from '@/components/common/LoadingState';
import { extractErrorMessage } from '@/lib/apiClient';
import {
  useAdminAdvisorsList,
  useAdminAdvisorsOverview,
  useAdminCreateAdvisor,
  useAdminUpdateAdvisor
} from '@/lib/queries/admin';
import { AdvisorOverviewCards } from '@/components/admin/advisors/AdvisorOverviewCards';
import { AdvisorsTable } from '@/components/admin/advisors/AdvisorsTable';
import { CreateAdvisorForm } from '@/components/admin/advisors/CreateAdvisorForm';

export default function AdminAdvisorsPage() {
  const {
    data: overview,
    isLoading: isOverviewLoading,
    error: overviewErrorData
  } = useAdminAdvisorsOverview();
  const {
    data: advisors,
    isLoading: isListLoading,
    error: listErrorData
  } = useAdminAdvisorsList();
  const updateAdvisor = useAdminUpdateAdvisor();
  const createAdvisor = useAdminCreateAdvisor();

  const isLoading = isOverviewLoading || isListLoading;
  const combinedError = overviewErrorData ?? listErrorData ?? null;

  const handleToggleActive = (advisorId: string, isActive: boolean) => {
    const id = Number(advisorId);
    if (!Number.isFinite(id)) return;
    updateAdvisor.mutate({ advisorId: id, data: { is_active: !isActive } });
  };

  const handleToggleBlocked = (advisorId: string, blocked: boolean) => {
    const id = Number(advisorId);
    if (!Number.isFinite(id)) return;
    updateAdvisor.mutate({ advisorId: id, data: { blocked: !blocked } });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <LoadingState label="Chargement des conseillers..." />
      </div>
    );
  }

  if (combinedError) {
    return (
      <div className="p-6">
        <ErrorAlert message={extractErrorMessage(combinedError)} />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-xl font-semibold">Advisors</h1>
        <p className="text-sm text-muted-foreground">
          Monitor advisor workload and manage concierge team.
        </p>
      </div>

      <AdvisorOverviewCards overview={overview ?? []} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          <AdvisorsTable
            advisors={advisors ?? []}
            onToggleActive={handleToggleActive}
            onToggleBlocked={handleToggleBlocked}
            isUpdating={updateAdvisor.isPending}
          />
        </div>
        <div className="lg:col-span-4">
          <CreateAdvisorForm
            onSubmit={(payload) => createAdvisor.mutate(payload)}
            isLoading={createAdvisor.isPending}
            error={createAdvisor.error}
            isSuccess={createAdvisor.isSuccess}
          />
        </div>
      </div>
    </div>
  );
}
