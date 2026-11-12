/**
 * `ScriptRunner` over the hosted cookie MCP of an AgentStack project (`POST /s/{pid}/mcp`), for
 * `stackscriptTransport`. Wire = JSON-RPC `tools/call` → `agentstack.execute` `{ action: 'script.run', params }`,
 * the same envelope @agentstack/sdk's hosted StackScript client and the games' live online code use
 * (shapes recorded from the platform: result.structuredContent | result.content[0].text → { data: { ok, data: { value } } }).
 *
 *   const runner = hostedMcpRunner({ projectId: 2052 });                       // same-origin game page: cookie session
 *   const transport = stackscriptTransport(runner, { scriptId: 'wt-duel-room', exportPrefix: 'wt' });
 *
 * Errors become `NetplayError` with a plain kind: 401 / auth codes → 'auth' (guest: sign in first),
 * 429 / rate codes → 'rate' (+ retryAfterMs), script_not_found → 'not-published', network / 5xx → 'offline'.
 * With `token()` a 401 first re-mints the hosted-app cookie (`POST /api/hosted-apps/{pid}/session`) and retries once.
 */
import { errorKind, NetplayError } from '../errors.js';
import type { ScriptRunner } from './stackscript.js';

export interface HostedMcpOptions {
  projectId: number;
  /** '' (default) = same origin as the page; e.g. 'https://agentstack.tech' from elsewhere. */
  origin?: string;
  /** Bearer token source (signed-in player). Without it the cookie session is used. */
  token?: () => string | null | undefined;
  fetch?: typeof fetch;
  /** Abort a request that hangs (ms). Default 15000 — the session then re-sends. */
  timeoutMs?: number;
}

type Json = Record<string, unknown>;
const obj = (v: unknown): Json | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Json) : null);

/** Unwrap a hosted MCP JSON-RPC reply to the action payload (`{ ok, data: { value }, error? }`). */
export function unwrapHostedReply(j: unknown): Json {
  const res = obj(obj(j)?.result) ?? obj(j) ?? {};
  let sc = obj(res.structuredContent);
  if (!sc) {
    const text = (res.content as { text?: string }[] | undefined)?.[0]?.text;
    if (typeof text === 'string') { try { sc = obj(JSON.parse(text)); } catch { sc = null; } }
  }
  sc ??= res;
  return obj(sc.data) && ('ok' in (sc.data as Json) || 'data' in (sc.data as Json) || 'error' in (sc.data as Json)) ? (sc.data as Json) : sc;
}

function codeOf(p: Json | null): string {
  if (!p) return '';
  const e = p.error ?? p.error_code ?? p.code ?? obj(p.detail)?.code;
  if (typeof e === 'string') return e;
  const eo = obj(e);
  return typeof eo?.code === 'string' ? eo.code : '';
}

const KEEPALIVE_MAX = 8 * 1024;

export function hostedMcpRunner(o: HostedMcpOptions): ScriptRunner {
  const f = o.fetch ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
  const base = (o.origin ?? '').replace(/\/+$/, '');
  let id = 0;
  const timeout = (): AbortSignal | undefined => (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal ? AbortSignal.timeout(o.timeoutMs ?? 15_000) : undefined);
  const headers = (): Record<string, string> => {
    const h: Record<string, string> = { 'content-type': 'application/json', accept: 'application/json', 'x-project-id': String(o.projectId) };
    const t = o.token?.();
    if (t) h.authorization = `Bearer ${t}`;
    return h;
  };
  const mint = async (): Promise<boolean> => {
    const t = o.token?.();
    if (!t) return false;
    try {
      const r = await f(`${base}/api/hosted-apps/${o.projectId}/session`, { method: 'POST', credentials: 'include', headers: headers(), body: '{}' });
      return r.ok;
    } catch { return false; }
  };
  const once = (params: Json) => {
    const body = JSON.stringify({ jsonrpc: '2.0', id: ++id, method: 'tools/call', params: { name: 'agentstack.execute', arguments: {
      action: 'script.run', params: { project_id: o.projectId, ...params }, context: { project_id: o.projectId }, options: { execution_intent: 'direct' },
    } } });
    // keepalive: the last write of a closing tab / swiped-away phone app (leave, away beat) still reaches the room.
    // Browsers cap keepalive bodies at 64 kB in flight, so only small requests (all of ours in practice) ask for it.
    return f(`${base}/s/${o.projectId}/mcp`, { method: 'POST', credentials: 'include', headers: headers(), signal: timeout(), body, keepalive: body.length < KEEPALIVE_MAX });
  };
  return {
    async run(p) {
      let r: Response;
      try {
        r = await once(p as unknown as Json);
        if (r.status === 401 && (await mint())) r = await once(p as unknown as Json);
      } catch (err) {
        throw new NetplayError('offline', 'network', String((err as Error)?.message ?? err));
      }
      let j: unknown = null;
      try { j = await r.json(); } catch { /* empty / html error page */ }
      if (!r.ok) {
        const code = codeOf(obj(j)) || `http_${r.status}`;
        const retry = Number(obj(j)?.retry_after_ms ?? Number(r.headers.get('retry-after') ?? 0) * 1000) || undefined;
        throw new NetplayError(errorKind(code, r.status), code, String(obj(j)?.message ?? ''), retry);
      }
      const payload = unwrapHostedReply(j);
      const code = payload.ok === false || payload.error ? codeOf(payload) || 'error' : '';
      if (code) throw new NetplayError(errorKind(code), code, String(payload.message ?? payload.hint ?? ''), Number(payload.retry_after_ms) || undefined);
      return payload;
    },
  };
}
