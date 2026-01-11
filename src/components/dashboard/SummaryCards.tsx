"use client";

import { Card, CardContent } from '@/components/ui/Card';

type SummaryState = {
  value: string | number;
  helper: string;
};

type SummaryCardsProps = {
  senderSummary: SummaryState;
  providerSummary: SummaryState;
  fundsSummary: SummaryState;
};

export function SummaryCards({ senderSummary, providerSummary, fundsSummary }: SummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="border-none bg-gradient-to-r from-blue-500 to-blue-400 text-white">
        <CardContent className="space-y-2">
          <p className="text-sm uppercase opacity-90">Escrows envoyés actifs</p>
          <p className="text-3xl font-semibold">{senderSummary.value}</p>
          <p className="text-sm opacity-90">{senderSummary.helper}</p>
        </CardContent>
      </Card>

      <Card className="border-none bg-gradient-to-r from-emerald-500 to-emerald-400 text-white">
        <CardContent className="space-y-2">
          <p className="text-sm uppercase opacity-90">Escrows prestataire en cours</p>
          <p className="text-3xl font-semibold">{providerSummary.value}</p>
          <p className="text-sm opacity-90">{providerSummary.helper}</p>
        </CardContent>
      </Card>

      <Card className="border-none bg-gradient-to-r from-purple-500 to-purple-400 text-white">
        <CardContent className="space-y-2">
          <p className="text-sm uppercase opacity-90">Fonds sous séquestre</p>
          <p className="text-3xl font-semibold">{fundsSummary.value}</p>
          <p className="text-sm opacity-90">{fundsSummary.helper}</p>
        </CardContent>
      </Card>
    </div>
  );
}
