export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
}

// We will also store which demo role is active in localStorage.
const DEMO_ROLE_KEY = 'kobatela_demo_role';

export type DemoRole = 'sender' | 'admin';

export function getDemoRole(): DemoRole {
  if (typeof window === 'undefined') {
    return 'sender';
  }
  const value = window.localStorage.getItem(DEMO_ROLE_KEY);
  if (value === 'admin' || value === 'sender') {
    return value;
  }
  return 'sender';
}

export function setDemoRole(role: DemoRole): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DEMO_ROLE_KEY, role);
}
