'use client';

// Client-side provider that sets up React Query for the entire app.
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useEffect, useState } from 'react';
import { hydrateSession } from '@/lib/auth';
import { setQueryClient } from '@/lib/queryClient';
import { createQueryClient } from '@/lib/reactQueryClient';

export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());

  useEffect(() => {
    setQueryClient(queryClient);
    hydrateSession(queryClient);
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
