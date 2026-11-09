/**
 * Thin hosted-app auth hook — wraps sdk.protocol session reads (App Studio CDN apps).
 */
import { useCallback, useEffect, useState } from 'react';

export type HostedAuthState = {
  loading: boolean;
  authenticated: boolean;
  userId?: number;
  error?: string;
};

export function useHostedAuth(projectId: number, options?: { baseUrl?: string }) {
  const [state, setState] = useState<HostedAuthState>({ loading: true, authenticated: false });

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: undefined }));
    try {
      const base = (options?.baseUrl ?? '').replace(/\/$/, '');
      const res = await fetch(`${base}/api/auth/me`, { credentials: 'include' });
      if (!res.ok) {
        setState({ loading: false, authenticated: false });
        return;
      }
      const data = (await res.json()) as { id?: number; user_id?: number };
      const uid = data.user_id ?? data.id;
      setState({
        loading: false,
        authenticated: typeof uid === 'number' && uid > 0,
        userId: typeof uid === 'number' ? uid : undefined,
      });
    } catch (e) {
      setState({
        loading: false,
        authenticated: false,
        error: e instanceof Error ? e.message : 'auth_failed',
      });
    }
  }, [options?.baseUrl]);

  useEffect(() => {
    if (projectId > 0) void refresh();
  }, [projectId, refresh]);

  return { ...state, refresh };
}
