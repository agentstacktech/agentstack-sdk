/**
 * Optional match bar (`@agentstack/netplay/ui`): the «match screen checklist» in one widget, for games that
 * do not want to build their own. A thin strip with every player (name, you, thinking / ready / no connection /
 * left, an optional per-seat detail), the turn clock, the series score and a «You are watching» badge; when the
 * match is over, a bottom panel with the result, the rematch vote («Rematch (1/2)», «Аня wants a rematch»,
 * «Аня left — start a new room»), New room and Menu. 48 px targets, ru / en / pt, one polite live region.
 *
 *   const bar = mountMatchBar(session, { labels: MATCH_BAR_LABELS.ru, done: (seat) => committed(seat),
 *     clock: () => msLeft(), onNewRoom, onMenu });
 *   bar.destroy();
 *
 * Headless: `matchBar(session.snapshot, options)` returns exactly what is painted (unit-test that).
 */
import { isWinner, outcomeWinners, resultWinners } from '../outcome.js';
import { seriesScore } from '../status.js';
import type { Session } from '../session.js';
import type { Outcome, Snapshot } from '../types.js';

export interface MatchBarLabels {
  you: string; thinking: string; ready: string; playing: string; finished: string; away: string; left: string; watching: string;
  win: string; lose: string; draw: string; winner: string; cleared: string; failed: string;
  rematch: string; rematchVotes: string; waitingOthers: string; wantsRematch: string; cantRematch: string;
  newRoom: string; menu: string; series: string; draws: string; coopSeries: string; seconds: string;
  reasonLeft: string; reasonAway: string; reasonHost: string;
  /** Several winners, seen by a spectator: «Winners: {names}» (optional; older label sets fall back to `winner`). */
  winners?: string;
  /** A player whose tab is in the background (`PlayerInfo.hidden`); optional, falls back to `away`. */
  stepped?: string;
}
const en: MatchBarLabels = {
  you: 'you', thinking: 'thinking…', ready: 'ready', playing: 'playing…', finished: 'finished', away: 'no connection', left: 'left', watching: 'You are watching',
  win: 'You won!', lose: 'You lost', draw: 'Draw', winner: 'Winner: {name}', cleared: 'Cleared together!', failed: 'Not this time',
  rematch: 'Rematch', rematchVotes: 'Rematch ({n}/{k})', waitingOthers: 'Waiting for the others… ({n}/{k})', wantsRematch: '{names} wants a rematch',
  cantRematch: 'Not enough players for a rematch — start a new room', newRoom: 'New room', menu: 'Menu',
  series: 'Series {mine}:{theirs}', draws: 'draws {d}', coopSeries: 'Cleared {w} of {n}', seconds: '{s} s',
  reasonLeft: '{names} left the game', reasonAway: '{names} lost connection', reasonHost: 'The host lost connection',
  winners: 'Winners: {names}', stepped: 'stepped away',
};
const ru: MatchBarLabels = {
  you: 'вы', thinking: 'думает…', ready: 'готов', playing: 'играет…', finished: 'закончил', away: 'нет связи', left: 'вышел', watching: 'Вы зритель',
  win: 'Вы победили!', lose: 'Вы проиграли', draw: 'Ничья', winner: 'Победа: {name}', cleared: 'Пройдено вместе!', failed: 'В этот раз не вышло',
  rematch: 'Реванш', rematchVotes: 'Реванш ({n}/{k})', waitingOthers: 'Ждём остальных… ({n}/{k})', wantsRematch: '{names}: хочет реванш',
  cantRematch: 'Для реванша не хватает игроков — создайте новую комнату', newRoom: 'Новая комната', menu: 'Меню',
  series: 'Счёт {mine}:{theirs}', draws: 'ничьих {d}', coopSeries: 'Пройдено {w} из {n}', seconds: '{s} с',
  reasonLeft: '{names}: вышел из игры', reasonAway: '{names}: нет связи', reasonHost: 'Ведущий потерял связь',
  winners: 'Победили: {names}', stepped: 'отошёл',
};
const pt: MatchBarLabels = {
  you: 'você', thinking: 'pensando…', ready: 'pronto', playing: 'jogando…', finished: 'terminou', away: 'sem conexão', left: 'saiu', watching: 'Você está assistindo',
  win: 'Você venceu!', lose: 'Você perdeu', draw: 'Empate', winner: 'Vitória: {name}', cleared: 'Vencemos juntos!', failed: 'Não foi dessa vez',
  rematch: 'Revanche', rematchVotes: 'Revanche ({n}/{k})', waitingOthers: 'Aguardando os outros… ({n}/{k})', wantsRematch: '{names} quer revanche',
  cantRematch: 'Faltam jogadores para a revanche — crie uma nova sala', newRoom: 'Nova sala', menu: 'Menu',
  series: 'Placar {mine}:{theirs}', draws: 'empates {d}', coopSeries: 'Vencidas {w} de {n}', seconds: '{s} s',
  reasonLeft: '{names} saiu do jogo', reasonAway: '{names} perdeu a conexão', reasonHost: 'O anfitrião perdeu a conexão',
  winners: 'Venceram: {names}', stepped: 'ausente',
};
export const MATCH_BAR_LABELS = { en, ru, pt } as const;

type Snap = Snapshot<unknown, unknown>;
export interface MatchBarOptions {
  labels?: Partial<MatchBarLabels>;
  /** 'versus' (default): win / lose / series; 'coop': everyone wins or loses together. */
  kind?: 'versus' | 'coop';
  /** coop: did this outcome count as a win? Default: reason 'cleared' or 'won'. */
  won?: (o: Outcome) => boolean;
  /** true = this seat already moved this turn («ready»), false = «thinking…», undefined = the game has no turns. With `pace: 'race'`: «finished» / «playing…». */
  done?: (seat: number, s: Snap) => boolean | undefined;
  /** 'turns' (default): thinking / ready. 'race' (everyone plays at once, e.g. a score race): playing / finished. */
  pace?: 'turns' | 'race';
  /** Short per-seat extra, e.g. «★ 1200». */
  detail?: (seat: number, s: Snap) => string | undefined;
  /** ms left on the turn / beat clock; null = no clock. */
  clock?: (s: Snap) => number | null;
  /**
   * Teams: the team of a seat (any small integer; undefined = no team). Teammates are listed together, each chip
   * carries the team name, the series is counted per team, and a team win (`Outcome.winners`) is «You won!» for
   * every member. Pair it with `teamName`.
   */
  team?: (seat: number, s: Snap) => number | undefined;
  /** Short team name / sign for a team number, e.g. `(t) => (t ? '☾ Луна' : '☀ Солнце')`. Default «1», «2», … */
  teamName?: (team: number) => string;
  /** Plain line for a game-specific outcome reason ('ko', 'score'…); undefined = none / the default for room reasons. */
  reason?: (o: Outcome, s: Snap) => string | undefined;
  /**
   * Show the end panel when the match is over (default true). false = the game keeps its own result screen:
   * the strip then shows the rematch vote / ask / «not enough players» and New room inline (`end.inline`).
   */
  endPanel?: boolean;
  onNewRoom?: () => void;
  onMenu?: () => void;
  /** Where the strip sits (default 'top'); pick the edge your own HUD leaves free. */
  position?: 'top' | 'bottom';
  /**
   * Show the strip only when it says something your HUD does not (default false = always): you are a spectator,
   * another player is away or left, or the match is over. For games whose HUD already marks who is ready.
   */
  quiet?: boolean;
}

export interface MatchBarModel {
  spectator: boolean;
  /** In seat order, or grouped by team when `team` is set. `team` = the team name ('' = no team). */
  players: { name: string; you: boolean; status: string; detail: string; team?: string }[];
  clock: { text: string; urgent: boolean } | null;
  series: string | null;
  end: null | { title: string; reason: string; rematch: { label: string; enabled: boolean } | null; note: string; inline: boolean };
  /** Another player is away or has left (the `quiet` strip shows then). */
  alert: boolean;
}

const fill = (t: string, v: Record<string, string | number>) => t.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ''));

/** What the bar shows for this snapshot (pure). */
export function matchBar(s: Snap, o: MatchBarOptions = {}): MatchBarModel {
  const L: MatchBarLabels = { ...en, ...o.labels };
  const spectator = s.seat < 0;
  const over = s.phase === 'over';
  // local seats are «you» too — until that player leaves mid-match («Бия вышел», not «Бия (вы) вышел»)
  const ours = (p: { id: string; owner?: string; status?: string }) => p.id === s.self || (!!p.owner && p.owner === s.self && p.status !== 'left');
  const teamOf = (seat: number) => (o.team ? o.team(seat, s) : undefined);
  const teamLabel = (t: number) => o.teamName?.(t) ?? String(t + 1);
  const listed = o.team ? [...s.players].sort((a, b) => (teamOf(a.seat) ?? 1e9) - (teamOf(b.seat) ?? 1e9) || a.seat - b.seat) : s.players;
  const players = listed.map((p) => {
    const d = p.status === 'on' && s.phase === 'playing' ? o.done?.(p.seat, s) : undefined;
    const race = o.pace === 'race';
    const status = p.status === 'left' ? L.left : p.status === 'away' ? (p.hidden ? (L.stepped ?? L.away) : L.away) : d === true ? (race ? L.finished : L.ready) : d === false && !ours(p) ? (race ? L.playing : L.thinking) : '';
    const t = teamOf(p.seat);
    return { name: p.name || p.id, you: ours(p), status, detail: o.detail?.(p.seat, s) ?? '', ...(t === undefined ? {} : { team: teamLabel(t) }) };
  });
  const ms = s.phase === 'playing' ? (o.clock?.(s) ?? null) : null;
  const clock = ms === null ? null : { text: fill(L.seconds, { s: Math.max(0, Math.ceil(ms / 1000)) }), urgent: ms <= 10_000 };
  const named = (ids: readonly string[]) => ids.map((id) => s.players.find((p) => p.id === id)?.name || id).join(', ');
  let series: string | null = null;
  if (s.results.length) {
    if (o.kind === 'coop') series = fill(L.coopSeries, { w: s.results.filter((r) => r.reason === 'cleared' || r.reason === 'won').length, n: s.results.length });
    else if (o.team) {
      // per team, by who is on it now (ids, so re-seating between matches does not matter)
      const teams = [...new Set(s.players.map((p) => teamOf(p.seat)).filter((t): t is number => t !== undefined))].sort((a, b) => a - b);
      const won = (t: number) => s.results.filter((r) => resultWinners(r).some((id) => { const q = s.players.find((p) => p.id === id); return !!q && teamOf(q.seat) === t; })).length;
      series = teams.map((t) => `${teamLabel(t)} ${won(t)}`).join(' · ');
    } else if (!spectator && s.players.length === 2) {
      const sc = seriesScore(s);
      series = fill(L.series, sc) + (sc.draws ? ` (${fill(L.draws, { d: sc.draws })})` : '');
    } else {
      const wins = s.players.map((p) => `${p.name || p.id} ${s.results.filter((r) => resultWinners(r).includes(p.id)).length}`);
      series = wins.join(' · ');
    }
  }
  let end: MatchBarModel['end'] = null;
  if (over && s.outcome) {
    const out = s.outcome;
    const ws = outcomeWinners(out);
    const won = o.won ?? ((x: Outcome) => x.reason === 'cleared' || x.reason === 'won');
    // the title for whoever watches: one winner by name, a whole team by its name, else the names
    const wp = ws.map((k) => s.players.find((p) => p.seat === k)).filter((p): p is NonNullable<typeof p> => !!p);
    const wTeams = new Set(ws.map((k) => teamOf(k)));
    const watched = ws.length > 1 && wTeams.size === 1 && !wTeams.has(undefined) ? fill(L.winner, { name: teamLabel([...wTeams][0]!) })
      : ws.length > 1 ? fill(L.winners ?? L.winner, { names: named(wp.map((p) => p.id)), name: named(wp.map((p) => p.id)) })
        : fill(L.winner, { name: wp[0]?.name || wp[0]?.id || '?' });
    // this device's seats (mine + local seats): all of them won → «You won!», none → «You lost»; a same-screen
    // match that some of them won and some lost names the winner, like a spectator sees it
    const seats = s.seats.length ? s.seats : [s.seat];
    const myWins = seats.filter((k) => isWinner(out, k)).length;
    const title = o.kind === 'coop' ? (won(out) ? L.cleared : L.failed)
      : !ws.length ? L.draw : spectator || (myWins > 0 && myWins < seats.length) ? watched : myWins ? L.win : L.lose;
    const gone = s.players.filter((p) => p.id !== s.self && p.status !== 'on');
    const room = out.reason === 'left' && gone.some((p) => p.status === 'left') ? fill(L.reasonLeft, { names: named(gone.filter((p) => p.status === 'left').map((p) => p.id)) })
      : (out.reason === 'timeout' || out.reason === 'forfeit') && gone.length ? fill(L.reasonAway, { names: named(gone.map((p) => p.id)) })
        : out.reason === 'host-lost' || out.reason === 'host-left' ? L.reasonHost : '';
    const reason = o.reason?.(out, s) ?? room;
    const voters = s.players.filter((p) => p.status === 'on');
    const votes = voters.filter((p) => s.rematch.includes(p.seat)).length;
    const enough = voters.length >= 2;
    const mine = s.players.find((p) => p.id === s.self);
    const voted = !!mine && s.rematch.includes(mine.seat);
    const askers = voters.filter((p) => !ours(p) && s.rematch.includes(p.seat)).map((p) => p.id);
    const rematch = spectator || !mine ? null : { label: voted ? fill(L.waitingOthers, { n: votes, k: voters.length }) : votes ? fill(L.rematchVotes, { n: votes, k: voters.length }) : L.rematch, enabled: enough && !voted && mine.status === 'on' };
    const note = !enough ? L.cantRematch : askers.length && !voted && !spectator ? fill(L.wantsRematch, { names: named(askers) }) : '';
    end = { title, reason, rematch, note, inline: o.endPanel === false };
  }
  const alert = s.players.some((p) => p.id !== s.self && p.status !== 'on');
  return { spectator, players, clock, series, end, alert };
}

const CSS = `.np-bar{position:fixed;left:0;right:0;top:0;z-index:1000;display:flex;flex-wrap:wrap;gap:6px;align-items:center;justify-content:center;
padding:max(6px,env(safe-area-inset-top)) 10px 6px;font:600 14px/1.25 var(--np-font,system-ui,sans-serif);color:var(--np-fg,#fff);pointer-events:none}
.np-bar.np-bottom{top:auto;bottom:0;padding:6px 10px max(6px,env(safe-area-inset-bottom))}.np-bar>*{pointer-events:auto}.np-chip{background:var(--np-bg,#000c);border-radius:999px;padding:5px 11px;white-space:nowrap}
.np-chip b{font-weight:700}.np-chip i{font-style:normal;color:var(--np-muted,#bbb);font-weight:500}.np-chip.np-me{outline:2px solid var(--np-accent,#ffcc4d)}
.np-chip.np-urgent{background:#b3261e}.np-bar.np-ended{left:50%;right:auto;transform:translateX(-50%);width:min(560px,100%);box-sizing:border-box;
background:var(--np-bg,#111e);border-radius:16px 16px 0 0;box-shadow:0 -4px 24px #0008;padding-top:10px}.np-bar.np-ended:not(.np-bottom){border-radius:0 0 16px 16px;box-shadow:0 4px 24px #0008}.np-end{position:fixed;left:50%;bottom:0;transform:translateX(-50%);z-index:1002;width:min(520px,100%);box-sizing:border-box;
padding:16px 16px max(16px,env(safe-area-inset-bottom));border-radius:16px 16px 0 0;background:var(--np-bg,#111e);color:var(--np-fg,#fff);
font:500 16px/1.35 var(--np-font,system-ui,sans-serif);text-align:center;box-shadow:0 -4px 24px #0008}
.np-end h2{margin:0 0 4px;font-size:22px}.np-end p{margin:4px 0}.np-end .np-row{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:12px}
.np-end button{min-height:48px;min-width:48px;padding:0 18px;border-radius:12px;border:0;font:600 16px var(--np-font,system-ui,sans-serif);cursor:pointer;
background:#fff2;color:inherit}.np-end button.np-main{background:var(--np-accent,#ffcc4d);color:var(--np-accent-fg,#222)}
.np-end button:disabled{opacity:.55;cursor:default}.np-end button:focus-visible,.np-chip:focus-visible{outline:3px solid var(--np-accent,#ffcc4d);outline-offset:2px}
.np-bar button{min-height:44px;padding:0 14px;border-radius:999px;border:0;font:600 15px var(--np-font,system-ui,sans-serif);cursor:pointer;background:var(--np-bg,#000c);color:inherit}
.np-bar button.np-main{background:var(--np-accent,#ffcc4d);color:var(--np-accent-fg,#222)}.np-bar button:disabled{opacity:.6;cursor:default}
.np-chip .np-team{font-style:normal;font-weight:700;color:var(--np-accent,#ffcc4d);margin-right:4px}
.np-bar[hidden],.np-end[hidden]{display:none!important}
.np-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}`;
/** The match bar's stylesheet (injected once as <style id="np-bar-css">); exported for audits and custom shells. */
export const MATCH_BAR_CSS = CSS;

export interface MatchBarUi { readonly el: HTMLElement; readonly model: MatchBarModel; destroy(): void }

/** Paint `matchBar(session.snapshot)` into `parent` (default document.body) and keep it current. */
export function mountMatchBar<S, I, V>(session: Session<S, I, V>, o: MatchBarOptions & { parent?: HTMLElement } = {}): MatchBarUi {
  const parent = o.parent ?? document.body, doc = parent.ownerDocument;
  if (!doc.getElementById('np-bar-css')) { const st = doc.createElement('style'); st.id = 'np-bar-css'; st.textContent = CSS; doc.head.append(st); }
  const root = doc.createElement('div'), bar = doc.createElement('div'), sr = doc.createElement('div');
  bar.className = o.position === 'bottom' ? 'np-bar np-bottom' : 'np-bar'; bar.dataset.test = 'np-bar';
  sr.className = 'np-sr'; sr.setAttribute('aria-live', 'polite');
  root.append(bar, sr);
  parent.append(root);
  let model = matchBar(session.snapshot as Snap, o), painted = '', said = '';
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text?: string) => { const e = doc.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const button = (label: string, on: () => void, main = false, disabled = false, k = '') => {
    const b = el('button', main ? 'np-main' : '', label); b.type = 'button'; b.disabled = disabled; b.dataset.k = k; b.onclick = on; return b;
  };
  const render = () => {
    model = matchBar(session.snapshot as Snap, o);
    const key = JSON.stringify(model);
    if (key === painted) return;
    painted = key;
    const focusK = (doc.activeElement as HTMLElement | null)?.dataset?.k;
    const chips: HTMLElement[] = [];
    if (model.spectator) chips.push(el('span', 'np-chip', (o.labels?.watching ?? en.watching)));
    for (const p of model.players) {
      const c = el('span', 'np-chip' + (p.you ? ' np-me' : ''));
      if (p.team) c.append(el('i', 'np-team', p.team));
      c.append(el('b', '', p.name + (p.you ? ` (${o.labels?.you ?? en.you})` : '')));
      if (p.detail) c.append(' ' + p.detail);
      if (p.status) c.append(' ', el('i', '', p.status));
      chips.push(c);
    }
    if (model.clock) { const c = el('span', 'np-chip' + (model.clock.urgent ? ' np-urgent' : ''), '⏱ ' + model.clock.text); c.dataset.test = 'np-clock'; chips.push(c); }
    if (model.series) { const c = el('span', 'np-chip', model.series); c.dataset.test = 'np-series'; chips.push(c); }
    const e = model.end;
    if (e?.inline) {
      // the game shows its own result screen: only the vote and the way out live in the strip — plus the result
      // itself when the room (not the rules) ended the match (someone left / lost connection): no game screen then
      if (e.reason) { const c = el('span', 'np-chip', `${e.title} — ${e.reason}`); c.dataset.test = 'np-result'; chips.push(c); }
      if (e.note) chips.push(el('span', 'np-chip', e.note));
      if (e.rematch) chips.push(button(e.rematch.label, () => session.rematch(), true, !e.rematch.enabled, 'rematch'));
      if (o.onNewRoom) chips.push(button(o.labels?.newRoom ?? en.newRoom, o.onNewRoom, false, false, 'new'));
    }
    bar.replaceChildren(...chips);
    // the inline end wraps to 2–3 lines over the game: give it one solid panel so it stays readable over any board
    bar.classList.toggle('np-ended', !!e?.inline);
    bar.hidden = (o.position === 'bottom' && !!e && !e.inline) || (!!o.quiet && !model.spectator && !e && !model.alert);
    if (e?.inline && focusK) (bar.querySelector(`[data-k="${focusK}"]`) as HTMLElement | null)?.focus();
    root.querySelector('.np-end')?.remove();
    if (e && !e.inline) {
      const panel = el('section', 'np-end'); panel.dataset.test = 'np-end';
      const h = el('h2', '', e.title); h.id = 'np-end-title'; panel.setAttribute('aria-labelledby', h.id);
      panel.append(h);
      if (e.reason) panel.append(el('p', '', e.reason));
      if (model.series) panel.append(el('p', '', model.series));
      if (e.note) panel.append(el('p', '', e.note));
      const row = el('div', 'np-row');
      if (e.rematch) row.append(button(e.rematch.label, () => session.rematch(), true, !e.rematch.enabled, 'rematch'));
      if (o.onNewRoom) row.append(button(o.labels?.newRoom ?? en.newRoom, o.onNewRoom, !e.rematch, false, 'new'));
      if (o.onMenu) row.append(button(o.labels?.menu ?? en.menu, o.onMenu, false, false, 'menu'));
      panel.append(row);
      root.append(panel);
      if (focusK) (panel.querySelector(`[data-k="${focusK}"]`) as HTMLElement | null)?.focus();
    }
    const say = e ? [e.title, e.reason, e.note].filter(Boolean).join('. ') : model.players.filter((p) => !p.you && p.status).map((p) => `${p.name}: ${p.status}`).join('. ');
    if (say !== said) { said = say; sr.textContent = say; }
  };
  const off = session.subscribe(render);
  const tick = setInterval(render, o.clock ? 250 : 1000);
  render();
  return { el: root, get model() { return model; }, destroy() { off(); clearInterval(tick); root.remove(); } };
}
