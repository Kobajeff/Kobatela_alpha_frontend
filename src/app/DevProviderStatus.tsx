'use client';

import { useEffect } from 'react';
import {
  DEV_DISABLE_CONNECTION_BANNER,
  DEV_DISABLE_DEMO_BANNER,
  DEV_DISABLE_GLOBAL_BANNERS
} from '@/lib/devFlags';

export function DevProviderStatus() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.info('[dev] banner flags:', {
        global: DEV_DISABLE_GLOBAL_BANNERS,
        connection: DEV_DISABLE_CONNECTION_BANNER,
        demo: DEV_DISABLE_DEMO_BANNER
      });
    }
  }, []);

  return null;
}
