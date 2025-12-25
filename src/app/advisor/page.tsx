'use client';

import { useEffect } from 'react';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';

const advisorQueuePath = ['', 'advisor', 'queue'].join('/');

export default function AdvisorHomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(advisorQueuePath as Route);
  }, [router]);

  return <div className="p-6">Redirection...</div>;
}
