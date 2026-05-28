/**
 * Auth state machine types
 */

export type AuthState =
  | 'unauthenticated'
  | 'authenticating'
  | 'authenticated'
  | 'logging_out'
  | 'session_expired';

export type AuthStateReason =
  | 'bootstrap'
  | 'login_success'
  | 'refresh_success'
  | 'manual_logout'
  | 'session_expired'
  | 'token_missing'
  | 'token_invalid'
  | 'refresh_failed'
  | 'forced_unauthenticated'
  | 'token_restored';

export interface AuthSnapshot {
  state: AuthState;
  reason?: AuthStateReason;
  user?: {
    id?: number | string;
    user_id?: number | string;
    project_id?: number | string;
    role?: string;
    email?: string;
  };
  tokens?: {
    accessToken?: string | null;
    refreshToken?: string | null;
    apiKey?: string | null;
    projectId?: number | string | undefined;
  };
  updatedAt: number;
}
