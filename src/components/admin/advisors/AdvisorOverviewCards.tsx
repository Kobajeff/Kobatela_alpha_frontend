'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/common/EmptyState';
import type { AdminAdvisorSummary } from '@/types/api';

interface AdvisorOverviewCardsProps {
  overview: AdminAdvisorSummary[];
}

export function AdvisorOverviewCards({ overview }: AdvisorOverviewCardsProps) {
  if (!overview || overview.length === 0) {
    return <EmptyState message="No advisor metrics are available yet." />;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {overview.map((row) => (
        <Card key={row.advisor_id} className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{row.name}</CardTitle>
            <p className="text-xs text-muted-foreground">{row.email}</p>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3 text-center text-sm">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Senders</p>
              <p className="text-xl font-semibold">{row.sender_managed}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Open proofs</p>
              <p className="text-xl font-semibold">{row.open_proofs ?? 0}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Cases</p>
              <p className="text-xl font-semibold">{row.total_number_of_case_managed}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
