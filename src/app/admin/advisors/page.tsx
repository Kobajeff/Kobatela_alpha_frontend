'use client';

import { useAdminAdvisorsList, useAdminAdvisorsOverview } from '@/lib/queries/admin';

export default function AdminAdvisorsPage() {
  const { data: overview, isLoading: loadingOverview } = useAdminAdvisorsOverview();
  const { data: advisors, isLoading: loadingAdvisors } = useAdminAdvisorsList();

  const isLoading = loadingOverview || loadingAdvisors;

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-xl font-semibold">Advisors</h1>
        <p className="text-sm text-muted-foreground">
          Monitor advisor workload (senders and open proofs) to keep the concierge model balanced.
        </p>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading advisors...</p>
      )}

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
          <div className="grid gap-3 md:grid-cols-2">
            {advisors.map((a) => (
              <div key={a.id} className="rounded-md border bg-white p-3 text-xs">
                <p className="font-semibold">
                  {a.first_name} {a.last_name}{' '}
                  {!a.is_active && (
                    <span className="ml-1 rounded bg-slate-100 px-1 text-[10px] text-slate-600">
                      inactive
                    </span>
                  )}
                </p>
                <p className="text-muted-foreground">{a.email}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Senders: {a.sender_managed} • Cases: {a.total_number_of_case_managed}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
