'use client';

import { AdvisorProfileCard } from '@/components/sender/MyAdvisorCard';
import { useMyAdvisor } from '@/lib/queries/sender';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { EmptyState } from '@/components/common/EmptyState';
import { extractErrorMessage } from '@/lib/apiClient';
import { isNoAdvisorAvailable } from '@/lib/errors';

export default function SenderAdvisorPage() {
  const { data: advisor, isLoading, isError, error } = useMyAdvisor();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <LoadingState label="Chargement de votre conseiller..." fullHeight={false} />
      </div>
    );
  }

  if (isError && !isNoAdvisorAvailable(error)) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <ErrorAlert message={extractErrorMessage(error)} />
      </div>
    );
  }

  const noAdvisor = isNoAdvisorAvailable(error) || !advisor;

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <h1 className="text-xl font-semibold">Your advisor</h1>
      <p className="text-sm text-muted-foreground">
        Kobatela assigns a dedicated advisor to help you follow your project, review proofs,
        and make sure funds are used as agreed. This is a concierge feature to reduce stress
        and increase trust for diaspora senders.
      </p>

      {noAdvisor ? (
        <EmptyState message="No advisor is available yet. We will assign one to you as soon as possible." />
      ) : (
        <AdvisorProfileCard advisor={advisor!} showProfileLink={false} />
      )}
    </div>
  );
}
