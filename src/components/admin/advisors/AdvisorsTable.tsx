'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/common/EmptyState';
import type { AdminAdvisorListItem } from '@/types/api';

interface AdvisorsTableProps {
  advisors: AdminAdvisorListItem[];
  onToggleActive: (advisorId: string, isActive: boolean) => void;
  onToggleBlocked: (advisorId: string, blocked: boolean) => void;
  isUpdating?: boolean;
}

export function AdvisorsTable({ advisors, onToggleActive, onToggleBlocked, isUpdating }: AdvisorsTableProps) {
  if (!advisors || advisors.length === 0) {
    return <EmptyState message="No advisors have been created yet." />;
  }

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="text-lg">Advisor directory</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-[11px] uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Advisor</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Country</th>
              <th className="px-3 py-2">Languages</th>
              <th className="px-3 py-2">Senders</th>
              <th className="px-3 py-2">Open proofs</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {advisors.map((advisor) => {
              const displayName = advisor.display_name || `${advisor.first_name} ${advisor.last_name}`;
              return (
                <tr key={advisor.id} className="border-b last:border-0">
                  <td className="px-3 py-3 text-sm font-semibold text-slate-800">{displayName}</td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">{advisor.email}</td>
                  <td className="px-3 py-3 text-xs text-slate-700">{advisor.country || '—'}</td>
                  <td className="px-3 py-3 text-xs text-slate-700">
                    {advisor.languages?.length ? advisor.languages.join(', ') : '—'}
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-700">{advisor.sender_managed}</td>
                  <td className="px-3 py-3 text-xs text-slate-700">{advisor.open_proofs ?? 0}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <Badge variant={advisor.is_active ? 'success' : 'default'}>
                        {advisor.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      {advisor.blocked && <Badge variant="danger">Blocked</Badge>}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isUpdating}
                        onClick={() => onToggleActive(advisor.id, advisor.is_active)}
                      >
                        {advisor.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={isUpdating}
                        onClick={() => onToggleBlocked(advisor.id, advisor.blocked)}
                      >
                        {advisor.blocked ? 'Unblock' : 'Block'}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
