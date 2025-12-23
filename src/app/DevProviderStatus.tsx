'use client';

import { useEffect } from 'react';
import { DEV_DISABLE_PROVIDERS } from '@/lib/devFlags';

export function DevProviderStatus() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.info('[dev] providers disabled:', DEV_DISABLE_PROVIDERS);
    }
  }, []);

  return null;
}
