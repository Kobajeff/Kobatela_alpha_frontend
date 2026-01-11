'use client';

import { useEffect, useState } from 'react';
import type { PortalMode } from '@/types/auth';
import { getPortalMode, getPortalModeEventName, setPortalMode } from '@/lib/portalMode';

export function usePortalMode(): [PortalMode, (mode: PortalMode) => void] {
  const [mode, setMode] = useState<PortalMode>(() => getPortalMode());

  useEffect(() => {
    const handleChange = () => setMode(getPortalMode());
    const eventName = getPortalModeEventName();
    window.addEventListener(eventName, handleChange);
    window.addEventListener('storage', handleChange);
    return () => {
      window.removeEventListener(eventName, handleChange);
      window.removeEventListener('storage', handleChange);
    };
  }, []);

  const updateMode = (nextMode: PortalMode) => {
    setPortalMode(nextMode);
    setMode(nextMode);
  };

  return [mode, updateMode];
}
