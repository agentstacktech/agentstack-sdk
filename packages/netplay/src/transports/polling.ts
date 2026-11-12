/**
 * Polling transport over any "room log" HTTP API. This is what works on AgentStack today
 * (WSS upgrades are not available everywhere), and it degrades gracefully: errors back off,
 * the session reconnects from its last seq, nothing is lost or applied twice.
 */
import type { Body, ConnectOptions, Entry, Link, Transport } from '../types.js';
import { NetplayError } from '../errors.js';

/** Minimal server contract. `stackscriptRoomApi` implements it on top of the SDK StackScript client. */
export interface RoomApi {
  readonly privateEntries: boolean;
  readonly kind?: string;
  /** Join (or re-join) a room; returns the caller identity assigned by the server. */
  join(room: string): Promise<{ self: string }>;
  append(room: string, body: Body, to?: string): Promise<void>;
  /** Entries with seq > afterSeq visible to the caller, in seq order. */
  poll(room: string, afterSeq: number): Promise<readonly Entry[]>;
}

export interface PollingOptions {
  /** Poll period while connected (ms). Default 400. */
  intervalMs?: number;
  /** Poll right after our own append so our input shows up fast. Default true. */
  pollAfterSend?: boolean;
  /** Max backoff after consecutive errors (ms). Default 5000. */
  maxBackoffMs?: number;
  /** Errors in a row before the link reports `offline` and closes (session then reconnects). Default 6. */
  maxErrors?: number;
  /** Min gap between an after-send poll and the previous poll (ms). Default 0. */
  minPollMs?: number;
}

/** Same curve as `pollBackoffMs` in @agentstack/sdk stackscript (base·2^n, capped). */
export function backoffMs(attempt: number, baseMs: number, capMs: number): number {
  return Math.min(capMs, baseMs * 2 ** Math.min(Math.max(attempt, 0), 6));
}

export function pollingTransport(api: RoomApi, o: PollingOptions = {}): Transport {
  const interval = o.intervalMs ?? 400;
  const cap = o.maxBackoffMs ?? 5000;
  const maxErrors = o.maxErrors ?? 6;
  return {
    caps: { privateEntries: api.privateEntries, kind: api.kind ?? 'polling' },
    async connect(room: string, opts: ConnectOptions): Promise<Link> {
      const { self } = await api.join(room);
      let cursor = opts.afterSeq;
      let alive = true;
      let errors = 0;
      let rateHits = 0;
      let rateWaitMs = 0;
      let lastPollAt = 0;
      let timer: ReturnType<typeof setTimeout> | null = null;
      let inflight = false;
      let again = false;
      let chain: Promise<unknown> = Promise.resolve();
      // after a failed append nothing later may reach the server first (the session re-sends from the failure, in order)
      let broken = false;
      const tick = async (): Promise<void> => {
        if (!alive) return;
        if (inflight) { again = true; return; }
        inflight = true;
        lastPollAt = Date.now();
        try {
          const es = await api.poll(room, cursor);
          errors = 0;
          rateHits = 0;
          const fresh = es.filter((e) => e.seq > cursor);
          if (fresh.length) {
            cursor = fresh[fresh.length - 1]!.seq;
            opts.onEntries(fresh);
          }
          opts.onStatus?.('online');
        } catch (err) {
          const kind = err instanceof NetplayError ? err.kind : 'offline';
          if (kind === 'auth' || kind === 'not-published') {
            // retrying fast cannot help (guest / script missing): report and let the session retry slowly
            opts.onStatus?.('offline', kind);
            link.close();
            return;
          }
          if (kind === 'rate') {
            // the server asked us to slow down: honour retry_after_ms, never count it as a dead link
            rateWaitMs = Math.max((err as NetplayError).retryAfterMs ?? 0, backoffMs(++rateHits, interval, cap));
            opts.onStatus?.('reconnecting', 'rate');
          } else {
            errors += 1;
            opts.onStatus?.(errors >= maxErrors ? 'offline' : 'reconnecting', String(err));
            if (errors >= maxErrors) { link.close(); return; }
          }
        } finally {
          inflight = false;
        }
        if (!alive) return;
        if (timer) clearTimeout(timer);
        const wait = rateWaitMs || (again ? 0 : errors ? backoffMs(errors, interval, cap) : interval);
        rateWaitMs = 0;
        timer = setTimeout(() => void tick(), wait);
        again = false;
      };
      const link: Link = {
        self,
        send(body, to) {
          if (!alive || broken) return Promise.reject(new Error('polling: link closed'));
          // serialize appends so the server sees them in call order
          const p = chain.then(() => {
            if (broken) throw new Error('polling: earlier append failed');
            return api.append(room, body, to);
          });
          chain = p.catch(() => { broken = true; });
          // poll right after our own entry so it shows up fast — but at most once per `minPollMs` (request budget)
          return p.then(() => { if ((o.pollAfterSend ?? true) && Date.now() - lastPollAt >= (o.minPollMs ?? 0)) void tick(); });
        },
        close() { alive = false; if (timer) clearTimeout(timer); },
      };
      void tick();
      return link;
    },
  };
}
