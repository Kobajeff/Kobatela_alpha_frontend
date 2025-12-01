'use client';

import { MyAdvisorCard } from '@/components/sender/MyAdvisorCard';

export default function SenderAdvisorPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <h1 className="text-xl font-semibold">Your advisor</h1>
      <p className="text-sm text-muted-foreground">
        Kobatela assigns a dedicated advisor to help you follow your project, review proofs,
        and make sure funds are used as agreed. This is a concierge feature to reduce stress
        and increase trust for diaspora senders.
      </p>
      <MyAdvisorCard />
    </div>
  );
}
