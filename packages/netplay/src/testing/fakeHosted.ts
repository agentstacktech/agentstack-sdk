/**
 * Local fake of the hosted AgentStack endpoints a published room script is played through:
 *   POST /api/hosted-apps/{pid}/session   (cookie mint; 401 {"detail":{"code":"unauthorized"}} without a bearer)
 *   POST /s/{pid}/mcp  tools/call agentstack.execute { action: 'script.run' }
 * Envelopes copy recorded platform replies (result.content[0].text + result.structuredContent, step data
 * `{ ok, data: { value }, fuel_used, script_id, export, idempotency_key, ... }`; guest 401 `auth_required`;
 * 429 `rate_limit_exceeded` + retry_after_ms; `script_not_found`). The script itself runs in `loadRoomScript`.
 *
 * Use it as `fetch` for `hostedMcpRunner` — the contract tests run each game's generated room script this way.
 */
import { ScriptError, type ScriptRuntime } from './scriptRuntime.js';

export interface FakeHostedOptions {
  projectId: number;
  scriptId: string;
  /** Bearer token → user id. Cookies minted from a token map to the same user. */
  tokens?: Record<string, string>;
  /** Clock for the script (`ctx.now_ms`) and the rate window. Default Date.now. */
  now?: () => number;
  /** Platform per-user request cap per second (429 above it). Default: no cap. */
  rateLimitPerSec?: number;
  retryAfterMs?: number;
  /** false = /s/{pid}/mcp only trusts the hosted_app cookie (Bearer only mints it). Default true. */
  mcpAcceptsBearer?: boolean;
  /** Network round trip per request (ms; half before the script runs, half after). Default 0. */
  latencyMs?: number;
}

export interface FakeHostedStats {
  total: number;
  byExport: Record<string, number>;
  byUser: Record<string, number>;
  rejected: { auth: number; rate: number; missing: number };
  reset(): void;
}

type Json = Record<string, unknown>;
const reply = (status: number, body: unknown, headers: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

function rpc(id: unknown, data: Json): Json {
  const env = { data, error: null, trace_id: 'fake-trace', capability_result: { ok: data.ok !== false, error_code: data.ok === false ? data.error : null }, envelope: 'compact', envelope_version: 2 };
  return {
    jsonrpc: '2.0', id,
    result: { content: [{ type: 'text', text: JSON.stringify(env) }], isError: false, structuredContent: { ok: true, data, trace_id: 'fake-trace' }, results: [{ ok: true, status: 'success', data }] },
  };
}

export function fakeHostedMcp(rt: ScriptRuntime, o: FakeHostedOptions) {
  const now = o.now ?? (() => Date.now());
  const tokens = o.tokens ?? {};
  const cookies = new Map<string, string>(); // cookie value → user (the browser jar is modelled per token)
  const idem = new Map<string, Json>();
  const window = new Map<string, number[]>();
  const stats: FakeHostedStats = {
    total: 0, byExport: {}, byUser: {}, rejected: { auth: 0, rate: 0, missing: 0 },
    reset() { this.total = 0; this.byExport = {}; this.byUser = {}; this.rejected = { auth: 0, rate: 0, missing: 0 }; },
  };
  const userOf = (h: Headers, bearerOk = true): string | null => {
    const bearer = /^Bearer (.+)$/.exec(h.get('authorization') ?? '')?.[1];
    if (bearerOk && bearer && tokens[bearer]) return tokens[bearer]!;
    return cookies.get(h.get('cookie') ?? '') ?? null;
  };

  const half = (o.latencyMs ?? 0) / 2;
  const wire = (): Promise<void> => (half > 0 ? new Promise((r) => setTimeout(r, half)) : Promise.resolve());
  const fetch = async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
    await wire();
    const r = serve(input, init);
    await wire();
    return r;
  };
  const serve = (input: RequestInfo | URL, init: RequestInit): Response => {
    const url = new URL(String(input), 'http://fake.local');
    const h = new Headers(init.headers);
    if (init.method !== 'POST') return reply(405, { detail: 'method not allowed' });
    if (url.pathname === `/api/hosted-apps/${o.projectId}/session`) {
      const user = userOf(h);
      if (!user) return reply(401, { detail: { code: 'unauthorized' } });
      cookies.set(`hosted_app=${user}`, user);
      return reply(200, { ok: true, project_id: o.projectId, aud: 'hosted_app', mcp_url: `/s/${o.projectId}/mcp`, states: ['disconnected', 'connecting', 'authenticated', 'scope_error', 'expired'] });
    }
    if (url.pathname !== `/s/${o.projectId}/mcp`) return reply(404, { detail: 'Not Found' });
    const req = JSON.parse(String(init.body ?? '{}')) as Json;
    const args = ((req.params as Json)?.arguments ?? {}) as Json;
    const p = (args.params ?? {}) as Json;
    const user = userOf(h, o.mcpAcceptsBearer ?? true);
    if (!user) {
      stats.rejected.auth += 1;
      return reply(401, { code: 'auth_required', message: 'Authenticate first: sign in on the hosted app (session cookie) or send Authorization: Bearer.', retryable: false });
    }
    if (o.rateLimitPerSec) {
      const t = now();
      const w = (window.get(user) ?? []).filter((x) => x > t - 1000);
      if (w.length >= o.rateLimitPerSec) {
        stats.rejected.rate += 1;
        const retry = o.retryAfterMs ?? 1000;
        return reply(429, { code: 'rate_limit_exceeded', message: 'Too many requests', retry_after_ms: retry, hint: 'honor retry_after_ms from response' }, { 'retry-after': String(Math.ceil(retry / 1000)) });
      }
      w.push(t);
      window.set(user, w);
    }
    stats.total += 1;
    stats.byUser[user] = (stats.byUser[user] ?? 0) + 1;
    if (args.action !== 'script.run') return reply(200, rpc(req.id, { ok: false, error: 'action_not_found' }));
    if (p.script_id !== o.scriptId) {
      stats.rejected.missing += 1;
      return reply(200, rpc(req.id, { ok: false, error: 'script_not_found', script_id: p.script_id, hint: 'script.put then script.publish, or pass version' }));
    }
    const exp = String(p.export);
    stats.byExport[exp] = (stats.byExport[exp] ?? 0) + 1;
    const key = typeof p.idempotency_key === 'string' ? `${user}|${p.idempotency_key}` : '';
    if (key && idem.has(key)) return reply(200, rpc(req.id, idem.get(key)!));
    rt.now = now();
    let data: Json;
    try {
      const value = rt.call(user, exp, (p.input ?? {}) as Json);
      data = { ok: true, data: { value }, fuel_used: 100, dry_run: false, write_set: [], cost: { fuel: 100, usd_est: 0.0001 }, script_id: o.scriptId, export: exp, idempotency_key: p.idempotency_key ?? null };
    } catch (err) {
      if (!(err instanceof ScriptError)) throw err;
      data = { ok: false, error: err.code, message: err.message, script_id: o.scriptId, export: exp };
    }
    if (key && data.ok) idem.set(key, data);
    return reply(200, rpc(req.id, data));
  };
  /**
   * A browser tab: its own cookie jar (`credentials: 'include'`). `signedIn` = a hosted_app cookie already set
   * (player signed in on the site); otherwise the tab is a guest until a Bearer mint sets the cookie.
   */
  const browser = (signedIn?: string): typeof globalThis.fetch => {
    let jar = '';
    if (signedIn) { jar = `hosted_app=${signedIn}`; cookies.set(jar, signedIn); }
    return (async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const h = new Headers(init.headers);
      if (jar) h.set('cookie', jar);
      const r = await fetch(input, { ...init, headers: h });
      if (r.ok && String(input).endsWith(`/api/hosted-apps/${o.projectId}/session`)) {
        const user = userOf(h);
        if (user) jar = `hosted_app=${user}`;
      }
      return r;
    }) as typeof globalThis.fetch;
  };
  return { fetch: fetch as typeof globalThis.fetch, browser, stats };
}
