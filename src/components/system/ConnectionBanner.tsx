'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { getSnapshot, setOnline, subscribe } from '@/lib/networkHealth';

export function ConnectionBanner() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (process.env.NODE_ENV === 'development') {
      console.info('[dev] ConnectionBanner mounted');
    }
    const initialOnline = window.navigator.onLine;
    setOnline(initialOnline);

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (snapshot.online && !snapshot.unstable) {
    return null;
  }

  const message = snapshot.online
    ? 'Connexion instable, tentative en cours'
    : 'Vous êtes hors ligne.';

  return (
    <div className="w-full bg-amber-500 px-4 py-2 text-center text-sm font-medium text-white">
      {message}
    </div>
  );
}
