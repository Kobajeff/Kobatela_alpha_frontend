'use client';

import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  useAdminAdvisorsList,
  useAdminAdvisorsOverview,
  useAdminUpdateAdvisor
} from '@/lib/queries/admin';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { extractErrorMessage } from '@/lib/apiClient';

export default function AdminAdvisorsPage() {
  const router = useRouter();
  const {
    data: overview,
    isLoading: loadingOverview,
    isError: overviewError,
    error: overviewErrorData
  } = useAdminAdvisorsOverview();
  const {
    data: advisors,
    isLoading: loadingAdvisors,
    isError: advisorsError,
    error: advisorsErrorData
  } = useAdminAdvisorsList();
  const updateAdvisor = useAdminUpdateAdvisor();

  const isLoading = loadingOverview || loadingAdvisors;
  const errorMessage = overviewError
    ? extractErrorMessage(overviewErrorData)
    : advisorsError
      ? extractErrorMessage(advisorsErrorData)
      : null;

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

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-xl font-semibold">Advisors</h1>
        <p className="text-sm text-muted-foreground">
          Monitor advisor workload (senders and open proofs) to keep the concierge model balanced.
        </p>
      </div>

      {isLoading && <LoadingState label="Chargement des conseillers..." />}

      {errorMessage && <ErrorAlert message={errorMessage} />}

      {!isLoading && overview && overview.length > 0 && (
        <div className="overflow-x-auto rounded-md border">
          <table className="min-w-full text-left text-xs">
            <thead className="border-b bg-slate-50 text-[11px] uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Advisor</th>
                <th className="px-3 py-2">Active senders</th>
                <th className="px-3 py-2">Open proofs</th>
                <th className="px-3 py-2">Total cases</th>
              </tr>
            </thead>
            <tbody>
              {overview.map((row) => (
                <tr key={row.advisor_id} className="border-b last:border-0">
                  <td className="px-3 py-2 text-sm">{row.full_name}</td>
                  <td className="px-3 py-2 text-xs">{row.active_senders}</td>
                  <td className="px-3 py-2 text-xs">{row.open_proofs}</td>
                  <td className="px-3 py-2 text-xs">{row.total_cases}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && advisors && advisors.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">Advisor directory</h2>
          <div className="overflow-x-auto rounded-md border bg-white">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b bg-slate-50 text-[11px] uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Advisor</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Senders</th>
                  <th className="px-3 py-2">Cases</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {advisors.map((a) => (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="px-3 py-2 text-sm font-semibold">
                      {a.first_name} {a.last_name}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{a.email}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={a.is_active ? 'success' : 'default'}>
                          {a.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        {a.blocked && <Badge variant="danger">Blocked</Badge>}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs">{a.sender_managed}</td>
                    <td className="px-3 py-2 text-xs">{a.total_number_of_case_managed}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/admin/advisors/${a.id}`)}
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={updateAdvisor.isPending}
                          onClick={() => handleToggleActive(a.id, a.is_active)}
                        >
                          {a.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={updateAdvisor.isPending}
                          onClick={() => handleToggleBlocked(a.id, a.blocked)}
                        >
                          {a.blocked ? 'Unblock' : 'Block'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
