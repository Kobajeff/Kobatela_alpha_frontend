'use client';

import { useAiProofSetting, useUpdateAiProofSetting } from '@/lib/queries/admin';

export default function AdminAiProofSettingsPage() {
  const { data, isLoading } = useAiProofSetting();
  const updateMutation = useUpdateAiProofSetting();

  const enabled = data?.bool_value ?? false;

  const handleToggle = () => {
    updateMutation.mutate(!enabled);
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-xl font-semibold">AI Proof Advisor</h1>
        <p className="text-sm text-muted-foreground">
          Control the global AI proof advisor. When enabled, proofs are analysed by AI
          (risk/scoring) before human review. Decisions remain human-operated.
        </p>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading AI setting...</p>
      )}

      {!isLoading && data && (
        <div className="space-y-3 rounded-md border bg-white p-4 text-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">
                AI Proof Advisor is {enabled ? 'enabled' : 'disabled'}
              </p>
              {data.source && (
                <p className="text-xs text-muted-foreground">Source: {data.source}</p>
              )}
            </div>
            <button
              type="button"
              onClick={handleToggle}
              disabled={updateMutation.isLoading}
              className="rounded-md border px-3 py-1 text-xs font-semibold"
            >
              {enabled ? 'Disable' : 'Enable'}
            </button>
          </div>

          <p className="text-xs text-muted-foreground">
            Keep AI in advisory mode: AI suggests risk levels and flags, but payouts only
            happen after a human decision in the review queue.
          </p>
        </div>
      )}
    </div>
  );
}
