'use client';

// Page showing all escrows for the logged-in sender.
import { extractErrorMessage } from '@/lib/apiClient';
import { SenderEscrowList } from '@/components/sender/SenderEscrowList';
import { useSenderEscrows } from '@/lib/queries/sender';

export default function SenderEscrowsPage() {
  const query = useSenderEscrows();

  if (query.isLoading) {
    return <div className="flex h-full items-center justify-center">Loading...</div>;
  }

  if (query.isError) {
    return (
      <div className="p-4">
        <div className="my-4 rounded bg-red-100 p-4 text-red-700">
          {extractErrorMessage(query.error)}
        </div>
      </div>
    );
  }

  const data = query.data;

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Mes escrows</h1>
      </div>
      <SenderEscrowList escrows={data} />
    </div>
  );
}
