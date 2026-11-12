/**
 * Who am I in a room: a stable per-tab **id** (transport user on local / dev-relay transports) and a **display name**
 * the player can change (remembered across visits). Kept apart so two friends both called «Саша» never share a seat.
 *
 *   const me = localName('tribute');            // { id: 'P-7K2M', name: 'P-7K2M' | 'Саша' }
 *   createSession(game, { transport: hub.transport(me.id), name: me.name, … });
 *   mountLobby(el, lobby, { nameField: me });    // «Your name» field on the first screen
 *
 * Duplicated tabs: «Duplicate tab» copies sessionStorage, so the copy would start with the same id and take the
 * original's seat. On load each tab asks the other live tabs over a BroadcastChannel «who has id X?»; a live tab
 * that holds X answers within a millisecond and the copy picks a fresh id. A reload or a tab restored after the
 * browser killed it gets no answer (the old page is gone) and keeps its id — and with it its seat.
 * The id only changes before the game first reads `me.id` (the lobby reads it on Create / Join), never mid-match.
 * A page that joins at once (invite link, `?join=`) must `await me.ready` first: the answer is async.
 */
export interface LocalName {
  readonly id: string; name: string;
  /** Resolves once the id is final: at once for a new tab / `?user=`; a restored id waits for a live tab's answer (≤ `waitMs`). */
  readonly ready: Promise<void>;
}
type Store = Pick<Storage, 'getItem' | 'setItem'>;
/** The part of BroadcastChannel this file uses (tests pass a fake). */
export interface IdChannel { postMessage(m: unknown): void; onmessage: ((e: { data: unknown }) => void) | null; close(): void }
const safe = <T>(get: () => T | undefined): T | undefined => { try { return get(); } catch { return undefined; } };
/** Storage can throw on every call (blocked cookies, private mode, quota) — treat that as «no storage». */
const read = (s: Store | undefined, k: string): string | null => { try { return s?.getItem(k) ?? null; } catch { return null; } };
const write = (s: Store | undefined, k: string, v: string): void => { try { s?.setItem(k, v); } catch { /* storage blocked */ } };
/** Display names: trimmed, control characters removed, at most 24 characters; empty → the id. */
export const cleanName = (v: string, fallback: string): string => v.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 24) || fallback;
const newId = () => 'P-' + Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, '0');
const defaultChannel = (): IdChannel | undefined => (typeof BroadcastChannel === 'function' ? new BroadcastChannel('netplay:id') as unknown as IdChannel : undefined);

/** This page (all localName() calls in it share it). */
const PAGE = Math.random().toString(36).slice(2);

interface Msg { k: 'who' | 'mine'; game: string; id: string; tab: string }

export function localName(game: string, o: { params?: URLSearchParams; local?: Store; session?: Store; channel?: () => IdChannel | undefined; waitMs?: number } = {}): LocalName {
  const local = o.local ?? safe(() => globalThis.localStorage), session = o.session ?? safe(() => globalThis.sessionStorage);
  const fromUrl = o.params?.get('user');
  const idKey = `netplay:id:${game}`, nameKey = 'netplay:name';
  let id = fromUrl ? fromUrl.slice(0, 24) : read(session, idKey) ?? '';
  const restored = !!id && !fromUrl;
  if (!id) { id = newId(); write(session, idKey, id); }
  let name = fromUrl ? id : cleanName(read(local, nameKey) ?? '', id);
  let used = false; // once the game read the id (a session uses it) it never changes
  let settle = () => {};
  let ready = Promise.resolve();
  if (!fromUrl) {
    // ?user= is an explicit QA identity: never renamed. Everyone else answers «mine» for its id and, if the id
    // came from a copied sessionStorage, asks once whether a live tab already holds it.
    const ch = safe(o.channel ?? defaultChannel);
    // one id per page: a second localName() in the same page (a game that calls it per lobby visit) must not answer
    // its own «who?» and swap the tab's id. Tests that inject a channel play separate tabs.
    const tab = o.channel ? Math.random().toString(36).slice(2) : PAGE;
    if (ch) {
      ch.onmessage = (e) => {
        const m = e.data as Msg;
        if (!m || m.game !== game || m.tab === tab || m.id !== id) return;
        if (m.k === 'who') safe(() => ch.postMessage({ k: 'mine', game, id, tab } satisfies Msg));
        else if (m.k === 'mine' && !used) {
          // a live tab holds this id: this tab is its copy → fresh id (the display name stays)
          const keepName = name === id ? null : name;
          id = newId();
          write(session, idKey, id);
          name = keepName ?? id;
          settle();
        }
      };
      if (restored) {
        // live tabs answer in ~1 ms; no answer within waitMs = reload / restored tab → keep the id
        ready = new Promise<void>((done) => { const t = setTimeout(done, o.waitMs ?? 150); settle = () => { clearTimeout(t); done(); }; });
        safe(() => ch.postMessage({ k: 'who', game, id, tab } satisfies Msg));
      }
    }
  }
  return {
    get id() { used = true; return id; },
    ready,
    get name() { return name; },
    set name(v: string) { name = cleanName(v, id); if (!fromUrl) write(local, nameKey, name === id ? '' : name); },
  };
}
