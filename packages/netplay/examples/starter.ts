/**
 * Starter — a whole browser multiplayer game: rules + lobby (room code / invite link) + board + match bar.
 * «21»: players take turns adding 1, 2 or 3; whoever reaches exactly 21 wins. Copy this file, change the rules.
 * In your app import from '@agentstack/netplay' and '@agentstack/netplay/ui' (AGENTS.md → «A new game in 10 minutes»).
 */
import { createLobby, createSession, defineGame, memoryHub, type MemoryHub, type Session, type Transport } from '../src/index.js';
import { localName, mountLobby, mountMatchBar, LOBBY_LABELS, MATCH_BAR_LABELS } from '../src/ui/index.js';

// ---- 1. rules: pure, deterministic, hostile input checked ----
export interface S21 { total: number; turn: number; moves: number[] }
export const twentyOne = defineGame<S21, number>({
  id: 'twenty-one', version: 1, seats: { min: 2, max: 2 }, mode: 'fold',
  setup: () => ({ total: 0, turn: 0, moves: [] }),
  input: (raw, seat, s) => (seat === s.turn && (raw === 1 || raw === 2 || raw === 3) && s.total + raw <= 21 ? raw : undefined),
  apply: (s, seat, n) => { s.total += n; s.moves.push(n); s.turn = 1 - seat; },
  outcome: (s) => (s.total === 21 ? { winner: 1 - s.turn, reason: '21' } : null),
  timeouts: { presenceMs: 30_000, onTimeout: 'forfeit' },
});

// ---- 2. transport: one in-page hub shared by same-origin iframes (no server); swap for stackscriptTransport in prod ----
type HubHost = Window & { __netplayHub?: MemoryHub };
export function localTransport(user: string): Transport {
  let host = window as HubHost;
  try { if (window.parent !== window && window.parent.location.origin === location.origin) host = window.parent as HubHost; } catch { /* cross-origin */ }
  return (host.__netplayHub ??= memoryHub({ manual: false, latencyMs: 40 })).transport(user);
}

// ---- 3. page: lobby → board; the match bar does players / turn / spectator / result / rematch / series ----
export function startStarter(root: HTMLElement, lang: 'ru' | 'en' | 'pt' = 'en', transport = localTransport) {
  // once per page, early: per-tab id (`?user=` wins — same-origin iframes share sessionStorage) + the name the player picked
  const me = localName(twentyOne.id, { params: new URLSearchParams(location.search) });
  const lobby = createLobby({
    game: twentyOne.id, // the id namespaces room ids
    connect: (room) => createSession(twentyOne, { transport: transport(me.id), room, name: me.name, autoPumpMs: 100 }),
    onStart: (session) => play(session),
  });
  const ui = mountLobby(root, lobby, { labels: LOBBY_LABELS[lang], title: '21', nameField: me });
  void me.ready.then(() => lobby.joinFromUrl() || lobby.create()); // a duplicated tab swaps its copied id first

  function play(session: Session<S21, number>) {
    const board = Object.assign(document.createElement('main'), { style: 'padding: 56px 12px' }); // below the bar
    root.append(board);
    const bar = mountMatchBar(session, {
      labels: MATCH_BAR_LABELS[lang],
      done: (seat, s) => { const st = s.state as S21 | null; return st ? seat !== st.turn : undefined; }, // on turn = «thinking…», the other = «ready»
      onNewRoom: () => { bar.destroy(); board.remove(); session.leave(); lobby.create(); ui.show(); }, // fresh code, lobby again
    });
    session.subscribe((snap) => {
      const s = snap.state; if (!s) return;
      const mine = snap.phase === 'playing' && snap.seat === s.turn;
      board.replaceChildren(Object.assign(document.createElement('h1'), { textContent: `${s.total} / 21` }),
        ...[1, 2, 3].map((n) => Object.assign(document.createElement('button'), {
          textContent: `+${n}`, disabled: !mine || s.total + n > 21, onclick: () => session.input(n),
        })));
      board.querySelectorAll('button').forEach((b) => { b.style.minWidth = b.style.minHeight = '48px'; b.dataset.test = 'add'; });
    });
  }
  return lobby;
}
