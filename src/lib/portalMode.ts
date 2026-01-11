'use client';

import type { PortalMode } from '@/types/auth';

const PORTAL_MODE_KEY = 'kobatela_portal_mode';
const PORTAL_MODE_EVENT = 'kobatela:portal-mode';
const DEFAULT_PORTAL_MODE: PortalMode = 'sender';

export function getPortalMode(): PortalMode {
  if (typeof window === 'undefined') return DEFAULT_PORTAL_MODE;
  const stored = window.localStorage.getItem(PORTAL_MODE_KEY);
  if (stored === 'provider' || stored === 'sender') {
    return stored;
  }
  return DEFAULT_PORTAL_MODE;
}

export function setPortalMode(mode: PortalMode): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PORTAL_MODE_KEY, mode);
  window.dispatchEvent(new CustomEvent(PORTAL_MODE_EVENT));
}

export function getPortalModeEventName(): string {
  return PORTAL_MODE_EVENT;
}
