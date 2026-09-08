/**
 * Breaks http-client ↔ AgentAuth cycle: token refresh delegates saved-credential
 * re-login to SDK bootstrap (`sdk.ts` registers `AgentAuth.login`).
 *
 * Genetic: core.auth.session_cache_contour.gen1
 */

export type SavedCredentialLoginResult = {
  access_token: string;
  refresh_token?: string;
};

export type SavedCredentialReloginInput = {
  email: string;
  password: string;
  project_id: number;
};

export type SavedCredentialReloginHandler = (
  input: SavedCredentialReloginInput,
) => Promise<SavedCredentialLoginResult | null>;

let handler: SavedCredentialReloginHandler | null = null;

export function registerSavedCredentialRelogin(fn: SavedCredentialReloginHandler): void {
  handler = fn;
}

export function clearSavedCredentialRelogin(): void {
  handler = null;
}

export async function attemptSavedCredentialRelogin(
  input: SavedCredentialReloginInput,
): Promise<SavedCredentialLoginResult | null> {
  if (!handler) return null;
  try {
    return await handler(input);
  } catch {
    return null;
  }
}
