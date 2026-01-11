export type GlobalRole = 'user' | 'admin' | 'support' | 'advisor';

export type PortalMode = 'sender' | 'provider';

export type EffectiveScope = string;

export interface AuthUser {
  id: number | string;
  email: string;
  username: string;
  role: GlobalRole;
  scopes?: EffectiveScope[];
  capabilities?: string[];
  full_name?: string;
  payout_channel?: string | null;
  api_scopes?: string[];
  scope?: string | string[];
  permissions?: string[];
}

export interface AuthMeResponse {
  user: AuthUser;
}
