'use client';

import { useEffect } from 'react';
import type { PortalMode } from '@/types/auth';
import { setPortalMode } from '@/lib/portalMode';

export function PortalModeSetter({ mode }: { mode: PortalMode }) {
  useEffect(() => {
    setPortalMode(mode);
  }, [mode]);

  return null;
}
