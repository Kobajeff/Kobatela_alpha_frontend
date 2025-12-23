'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { getSnapshot, setOnline, subscribe } from '@/lib/networkHealth';

export function ConnectionBanner() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const [online, setLocalOnline] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.navigator.onLine;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (process.env.NODE_ENV === 'development') {
      console.info('[dev] ConnectionBanner mounted');
    }
    const initialOnline = window.navigator.onLine;
    setLocalOnline((prev) => (prev === initialOnline ? prev : initialOnline));
    setOnline(initialOnline);

    const handleOnline = () => {
      setLocalOnline((prev) => (prev === true ? prev : true));
      setOnline(true);
    };
    const handleOffline = () => {
      setLocalOnline((prev) => (prev === false ? prev : false));
      setOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (online && !snapshot.unstable) {
    return null;
  }

  const message = online
    ? 'Connexion instable, tentative en cours'
    : 'Vous êtes hors ligne.';

  return (
    <div className="w-full bg-amber-500 px-4 py-2 text-center text-sm font-medium text-white">
      {message}
    </div>
  );
}
