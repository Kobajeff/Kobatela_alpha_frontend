'use client';

import { useEffect } from 'react';
import { resetSession } from '@/lib/sessionReset';
import { getQueryClient } from '@/lib/queryClient';
import { LoadingState } from '@/components/common/LoadingState';

export default function LogoutPage() {
  useEffect(() => {
    resetSession(getQueryClient(), { redirectTo: '/login' });
  }, []);

  return (
    <main>
      <div className="container max-w-md rounded-lg bg-white p-8 shadow">
        <LoadingState label="Déconnexion..." fullHeight={false} />
      </div>
    </main>
  );
}
