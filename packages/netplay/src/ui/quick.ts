/**
 * One multiplayer screen for every game (owner's layout, TG 2183 / 13.11.2026):
 *   menu  — «Быстрый матч» · «Создать свой матч» · «Подключиться к матчу» (+ «Играть одному»)
 *   room  — players filling the room, a countdown that starts at once, then the match boots
 *   join  — code field on top, open rooms below (shows «скоро» while the server has no rooms.list_open)
 * Guests: solo, quick match and join by code. Creating an own match needs an account (`signedIn()`).
 *
 *   const ui = mountQuickPlay(document.body, {
 *     rooms: hostedRooms({ projectId: 2141, scriptId: 'serpent-coop-room' }),
 *     connect: (m) => createSession(game, { transport: relayTransport({ self: me.id, host: m.seat === 0, url: () => rooms.wsUrl(m) }), room: m.roomId, name: me.name }),
 *     onStart: (s) => runOnline(s), onSolo: startSolo, signedIn: () => !!token(),
 *   });
 */
import { setActiveMatch, type QuickMatch, type RoomsApi } from '../rooms.js';
import { NetplayError } from '../errors.js';

interface SessionLike {
  readonly snapshot: { readonly phase: string; readonly players: readonly { id: string; name: string; seat: number; status: string }[]; readonly self: string };
  subscribe(fn: (s: SessionLike['snapshot']) => void): () => void;
  join(): Promise<void>;
  ready(): void;
  leave(): void;
}

export interface QuickLabels {
  title: string; quick: string; quickHint: string; create: string; createHint: string; join: string; joinHint: string; solo: string;
  searching: string; startsIn: string; players: string; you: string; emptySeat: string; cancel: string; back: string;
  noOpponent: string; waitMore: string; codeTitle: string; codePlaceholder: string; codeGo: string; openRooms: string;
  openSoon: string; openEmpty: string; codeSoon: string; createSoon: string; signInToCreate: string; signIn: string;
  invite: string; copied: string; offline: string; badCode: string; preview: string; close: string;
}
export const QUICK_LABELS: Record<'ru' | 'en' | 'pt', QuickLabels> = {
  ru: {
    title: 'Мультиплеер', quick: 'Быстрый матч', quickHint: 'Сразу в комнату, старт по отсчёту', create: 'Создать свой матч', createHint: 'Комната с кодом для друзей',
    join: 'Подключиться к матчу', joinHint: 'По коду или из списка комнат', solo: 'Играть одному',
    searching: 'Ищем соперника', startsIn: 'Старт через', players: 'Игроки', you: 'вы', emptySeat: 'свободное место', cancel: 'Отмена', back: 'Назад',
    noOpponent: 'Соперник пока не нашёлся', waitMore: 'Ждать ещё', codeTitle: 'Подключиться по коду', codePlaceholder: 'Код или ссылка-приглашение', codeGo: 'Войти',
    openRooms: 'Открытые комнаты', openSoon: 'Список комнат скоро появится на сервере', openEmpty: 'Открытых комнат нет', codeSoon: 'Вход по коду скоро появится на сервере. Пока войдите по ссылке-приглашению из быстрого матча.',
    createSoon: 'Свой матч скоро появится на сервере. Пока позовите друга ссылкой из быстрого матча.', signInToCreate: 'Чтобы создать свой матч, войдите в аккаунт. Без входа доступны быстрый матч и вход по коду.', signIn: 'Войти',
    invite: 'Скопировать приглашение', copied: 'Ссылка скопирована', offline: 'Нет связи с игровым сервером. Попробуйте ещё раз.', badCode: 'Код не подошёл',
    preview: 'Тестовый режим', close: 'Закрыть',
  },
  en: {
    title: 'Multiplayer', quick: 'Quick match', quickHint: 'Straight into a room, starts on a countdown', create: 'Create a match', createHint: 'A room with a code for friends',
    join: 'Join a match', joinHint: 'By code or from the room list', solo: 'Play solo',
    searching: 'Looking for an opponent', startsIn: 'Starts in', players: 'Players', you: 'you', emptySeat: 'free seat', cancel: 'Cancel', back: 'Back',
    noOpponent: 'No opponent yet', waitMore: 'Keep waiting', codeTitle: 'Join by code', codePlaceholder: 'Code or invite link', codeGo: 'Join',
    openRooms: 'Open rooms', openSoon: 'The room list is coming to the server soon', openEmpty: 'No open rooms', codeSoon: 'Joining by code is coming soon. For now use the invite link from a quick match.',
    createSoon: 'Own matches are coming soon. For now invite a friend with the quick match link.', signInToCreate: 'Sign in to create a match. Without an account you can play a quick match or join by code.', signIn: 'Sign in',
    invite: 'Copy invite', copied: 'Link copied', offline: 'Can’t reach the game server. Try again.', badCode: 'That code did not work',
    preview: 'Preview', close: 'Close',
  },
  pt: {
    title: 'Multijogador', quick: 'Partida rápida', quickHint: 'Direto para uma sala, começa na contagem', create: 'Criar partida', createHint: 'Sala com código para amigos',
    join: 'Entrar numa partida', joinHint: 'Por código ou pela lista de salas', solo: 'Jogar sozinho',
    searching: 'Procurando adversário', startsIn: 'Começa em', players: 'Jogadores', you: 'você', emptySeat: 'lugar livre', cancel: 'Cancelar', back: 'Voltar',
    noOpponent: 'Nenhum adversário ainda', waitMore: 'Esperar mais', codeTitle: 'Entrar com código', codePlaceholder: 'Código ou link de convite', codeGo: 'Entrar',
    openRooms: 'Salas abertas', openSoon: 'A lista de salas chega em breve ao servidor', openEmpty: 'Nenhuma sala aberta', codeSoon: 'Entrar por código chega em breve. Por enquanto use o link de convite da partida rápida.',
    createSoon: 'Partidas próprias chegam em breve. Por enquanto convide um amigo com o link da partida rápida.', signInToCreate: 'Entre na conta para criar uma partida. Sem conta: partida rápida e entrar por código.', signIn: 'Entrar',
    invite: 'Copiar convite', copied: 'Link copiado', offline: 'Sem conexão com o servidor. Tente de novo.', badCode: 'Esse código não funcionou',
    preview: 'Prévia', close: 'Fechar',
  },
};

export interface QuickPlayOptions<S extends SessionLike> {
  rooms: RoomsApi;
  /** Build the session for a match (relay transport + game). Called once per match. */
  connect: (m: QuickMatch) => S;
  /** The match is running (both pressed ready after the countdown): hand the session to the game. */
  onStart: (s: S, m: QuickMatch) => void;
  onSolo?: () => void;
  onClose?: () => void;
  /** true = signed-in player (may create matches). Guests get solo / quick match / join by code. */
  signedIn?: () => boolean;
  onSignIn?: () => void;
  labels?: Partial<QuickLabels>;
  lang?: 'ru' | 'en' | 'pt';
  title?: string;
  /** Countdown once the room is full (s). Default 3. */
  countdownS?: number;
  /** How long a quick match looks for an opponent before asking (ms). Default 15000. */
  searchMs?: number;
  pollMs?: number;
  /** Build the invite URL for a match (default: this page + ?match=&invite=). */
  inviteUrl?: (m: QuickMatch) => string;
  /** Show a small «preview» badge (dev flag). */
  preview?: boolean;
  doc?: Document;
}
export interface QuickPlayUi { show(): void; hide(): void; destroy(): void; joinFromUrl(): boolean }

const CSS = `.npq{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:16px;background:var(--np-backdrop,#0009);font:16px/1.45 var(--np-font,system-ui,sans-serif);color:var(--np-fg,#f6ecd9)}
.npq[hidden]{display:none}
.npq-card{width:min(440px,100%);max-height:calc(100dvh - 32px);overflow:auto;display:flex;flex-direction:column;gap:12px;padding:24px 20px;border-radius:22px;background:var(--np-bg,#1f1812);border:1px solid var(--np-line,#ffffff1f);box-shadow:0 24px 60px #000a}
.npq h2{margin:0 0 4px;font-size:13px;letter-spacing:.2em;text-transform:uppercase;color:var(--np-muted,#bba98c);text-align:center}
.npq-b{display:flex;flex-direction:column;align-items:flex-start;gap:2px;width:100%;min-height:60px;padding:12px 16px;border-radius:16px;border:1px solid var(--np-line,#ffffff1f);background:var(--np-key,#ffffff14);color:inherit;font:700 18px var(--np-font,system-ui);text-align:left;cursor:pointer}
.npq-b small{font-weight:500;font-size:13px;color:var(--np-muted,#bba98c)}
.npq-b.main{background:var(--np-accent,#f0b545);color:var(--np-accent-fg,#1b130b);border-color:transparent}
.npq-b.main small{color:inherit;opacity:.75}
.npq-b:disabled{opacity:.45;cursor:default}
.npq-row{display:flex;gap:8px;width:100%}
.npq-row .npq-b{align-items:center;justify-content:center;min-height:48px;font-size:16px}
.npq-in{flex:1;min-width:0;min-height:48px;padding:0 14px;border-radius:14px;border:1px solid var(--np-line,#ffffff1f);background:#0003;color:inherit;font:600 17px var(--np-font,system-ui);text-transform:uppercase}
.npq-big{font-size:64px;font-weight:800;line-height:1;text-align:center;font-variant-numeric:tabular-nums}
.npq-note{margin:0;font-size:14px;color:var(--np-muted,#bba98c);text-align:center}
.npq-err{margin:0;font-size:14px;color:#ff9b8a;text-align:center}
.npq-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.npq-list li{display:flex;justify-content:space-between;gap:8px;padding:10px 14px;border-radius:12px;background:#0002}
.npq-list li.empty{opacity:.5;font-style:italic}
.npq-tag{align-self:center;font-size:11px;letter-spacing:.12em;text-transform:uppercase;padding:2px 8px;border-radius:999px;border:1px solid var(--np-line,#ffffff1f);color:var(--np-muted,#bba98c)}`;

/** Best guess without a game hook: a bearer token in this tab's storage (games pass `signedIn` when they know better). */
export function guessSignedIn(): boolean {
  try {
    for (const st of [sessionStorage, localStorage]) for (let i = 0; i < st.length; i++) { const k = st.key(i) ?? ''; if (/(^|[._:-])(access_token|bearer|bt|token)$/i.test(k) && (st.getItem(k) ?? '').length > 16) return true; }
  } catch { /* storage blocked */ }
  return false;
}

export function mountQuickPlay<S extends SessionLike>(container: HTMLElement, o: QuickPlayOptions<S>): QuickPlayUi {
  const doc = o.doc ?? document;
  const L: QuickLabels = { ...QUICK_LABELS[o.lang ?? 'ru'], ...(o.labels ?? {}) };
  if (!doc.getElementById('npq-css')) { const st = doc.createElement('style'); st.id = 'npq-css'; st.textContent = CSS; doc.head.append(st); }
  const root = doc.createElement('div');
  root.className = 'npq';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  const card = doc.createElement('div');
  card.className = 'npq-card';
  root.append(card);
  container.append(root);
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => { const e = doc.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };
  const btn = (title: string, hint: string, fn: () => void, main = false, disabled = false): HTMLButtonElement => {
    const b = el('button', 'npq-b' + (main ? ' main' : ''), title); b.type = 'button';
    if (hint) b.append(el('small', '', hint));
    b.disabled = disabled; b.onclick = fn; return b;
  };
  const signed = () => (o.signedIn ? !!o.signedIn() : guessSignedIn());
  let timers: ReturnType<typeof setInterval>[] = [];
  let unsub: (() => void) | null = null;
  let cur: { m: QuickMatch; s: S } | null = null;
  let token = 0; // invalidates async work of a screen that was left
  const stop = () => { for (const t of timers) clearInterval(t); timers = []; unsub?.(); unsub = null; };
  const head = (t: string) => { card.replaceChildren(); const h = el('h2', '', t); card.append(h); if (o.preview) { const tag = el('span', 'npq-tag', L.preview); h.append(' ', tag); } };
  const say = (msg: string, err = false) => card.append(el('p', err ? 'npq-err' : 'npq-note', msg));
  const msgOf = (e: unknown) => (e instanceof NetplayError && e.kind === 'offline' ? L.offline : e instanceof NetplayError ? `${L.offline} (${e.code})` : L.offline);

  function menu(err = ''): void {
    stop(); token++;
    head(o.title ?? L.title);
    card.append(btn(L.quick, L.quickHint, () => void quick(), true));
    card.append(btn(L.create, signed() ? L.createHint : L.signInToCreate, () => create(), false));
    card.append(btn(L.join, L.joinHint, () => join(), false));
    if (o.onSolo) card.append(btn(L.solo, '', () => { hide(); o.onSolo!(); }));
    if (o.onClose) { const r = el('div', 'npq-row'); r.append(btn(L.close, '', () => { hide(); o.onClose!(); })); card.append(r); }
    if (err) say(err, true);
  }

  function create(): void {
    stop(); token++;
    head(L.create);
    if (!signed()) {
      say(L.signInToCreate);
      if (o.onSignIn) card.append(btn(L.signIn, '', () => o.onSignIn!(), true));
    } else if (o.rooms.support().create === false) say(L.createSoon);
    else {
      const my = token;
      say('…');
      o.rooms.create().then((m) => { if (my === token) room(m); else void o.rooms.leave(m); }).catch((e) => {
        if (my !== token) return;
        head(L.create);
        say(e instanceof NetplayError && e.code === 'action_not_found' ? L.createSoon : msgOf(e), !(e instanceof NetplayError && e.code === 'action_not_found'));
        card.append(btn(L.back, '', () => menu()));
      });
      return;
    }
    card.append(btn(L.back, '', () => menu()));
  }

  function join(err = ''): void {
    stop(); token++;
    const my = token;
    head(L.codeTitle);
    const row = el('div', 'npq-row');
    const inp = el('input', 'npq-in'); inp.placeholder = L.codePlaceholder; inp.autocomplete = 'off'; inp.spellcheck = false;
    const go = btn(L.codeGo, '', () => void byCode(inp.value), true);
    inp.onkeydown = (ev) => { if (ev.key === 'Enter') void byCode(inp.value); };
    row.append(inp, go);
    card.append(row);
    if (err) say(err, true);
    card.append(el('h2', '', L.openRooms));
    const list = el('ul', 'npq-list');
    card.append(list);
    const fill = () => {
      if (o.rooms.support().listOpen === false) { list.replaceChildren(el('li', 'empty', L.openSoon)); return; }
      o.rooms.listOpen().then((rs) => {
        if (my !== token) return;
        list.replaceChildren(...(rs.length ? rs.map((r) => { const li = el('li', '', r.name || r.code || r.roomId); li.append(el('span', '', `${r.seatsTaken}/${r.seatsNeeded}`)); if (r.code) { li.style.cursor = 'pointer'; li.onclick = () => void byCode(r.code!); } return li; }) : [el('li', 'empty', L.openEmpty)]));
      }).catch(() => { if (my === token) list.replaceChildren(el('li', 'empty', L.openSoon)); });
    };
    fill();
    timers.push(setInterval(fill, 5000));
    card.append(btn(L.back, '', () => menu()));
    setTimeout(() => inp.focus(), 0);
  }

  async function byCode(raw: string): Promise<void> {
    const v = raw.trim();
    if (!v) return;
    const my = ++token;
    const inv = /[?&]match=([^&\s]+)/.exec(v) ? { match: decodeURIComponent(/[?&]match=([^&\s]+)/.exec(v)![1]!), invite: decodeURIComponent(/[?&]invite=([^&\s]+)/.exec(v)?.[1] ?? '') } : null;
    try {
      if (inv) {
        const m = await o.rooms.quickMatch(inv);
        if (my !== token) return;
        if (m.matchId !== inv.match) { void o.rooms.leave(m); join(L.codeSoon); return; } // the server put us elsewhere: no invite join yet
        room(m);
      } else {
        if (o.rooms.support().joinByCode === false) { join(L.codeSoon); return; }
        const m = await o.rooms.joinByCode(v);
        if (my === token) room(m);
      }
    } catch (e) {
      if (my !== token) return;
      join(e instanceof NetplayError && e.code === 'action_not_found' ? L.codeSoon : e instanceof NetplayError && e.kind === 'server' ? L.badCode : msgOf(e));
    }
  }

  async function quick(): Promise<void> {
    stop();
    const my = ++token;
    head(L.quick);
    say(L.searching + '…');
    try {
      const m = await o.rooms.quickMatch();
      if (my === token) room(m); else void o.rooms.leave(m);
    } catch (e) { if (my === token) menu(msgOf(e)); }
  }

  function room(m0: QuickMatch): void {
    stop();
    const my = ++token;
    let m = m0;
    setActiveMatch(m, o.rooms);
    const s = o.connect(m);
    cur = { m, s };
    let searchDeadline = Date.now() + (o.searchMs ?? 15000);
    const search = o.searchMs ?? 15000;
    let goAt = 0; // countdown to start once full
    let started = false;
    let asked = false;
    head(L.title);
    const big = el('div', 'npq-big', '');
    const line = el('p', 'npq-note', '');
    const list = el('ul', 'npq-list');
    const foot = el('div', 'npq-row');
    const inviteB = btn(L.invite, '', () => {
      const url = o.inviteUrl ? o.inviteUrl(m) : (() => { const u = new URL(location.href); u.searchParams.set('match', m.matchId); if (m.invite) u.searchParams.set('invite', m.invite); return u.toString(); })();
      void navigator.clipboard?.writeText(url).then(() => { inviteB.firstChild!.textContent = L.copied; }, () => {});
    });
    const cancel = btn(L.cancel, '', () => { s.leave(); void o.rooms.leave(m); cur = null; menu(); });
    foot.append(inviteB, cancel);
    card.append(line, big, el('h2', '', L.players), list, foot);
    const seats = () => Math.max(m.seatsNeeded, 2);
    const present = () => s.snapshot.players.filter((p) => p.status !== 'left' && p.seat >= 0);
    const full = () => present().length >= seats() || (m.status === 'started' && present().length >= 2);
    const draw = () => {
      if (my !== token) return;
      const ps = present();
      const items = ps.map((p) => el('li', '', p.name + (p.id === s.snapshot.self ? ` (${L.you})` : '')));
      for (let i = ps.length; i < seats(); i++) items.push(el('li', 'empty', L.emptySeat));
      list.replaceChildren(...items);
      const now = Date.now();
      if (goAt && !full() && !started) goAt = 0;
      if (!goAt && full()) goAt = now + (o.countdownS ?? 3) * 1000;
      if (goAt) {
        const left = Math.max(0, Math.ceil((goAt - now) / 1000));
        line.textContent = L.startsIn; big.textContent = String(left);
        if (left === 0 && !started) { started = true; s.ready(); }
      } else {
        const left = Math.max(0, Math.ceil((searchDeadline - now) / 1000));
        line.textContent = `${L.searching} · ${ps.length}/${seats()}`; big.textContent = `0:${String(left).padStart(2, '0')}`;
        if (left === 0 && !asked) {
          asked = true;
          const more = btn(L.waitMore, '', () => { asked = false; more.remove(); solo?.remove(); searchDeadline = Date.now() + search; });
          const solo = o.onSolo ? btn(L.solo, '', () => { s.leave(); void o.rooms.leave(m); cur = null; hide(); o.onSolo!(); }) : null;
          line.textContent = L.noOpponent;
          card.insertBefore(more, foot); if (solo) card.insertBefore(solo, foot);
        }
      }
    };
    unsub = s.subscribe((snap) => {
      draw();
      if (snap.phase === 'playing' && my === token) { const c = cur!; stop(); token++; cur = null; hide(); o.onStart(c.s, c.m); }
    });
    timers.push(setInterval(draw, 250));
    timers.push(setInterval(() => { if (!goAt) void o.rooms.status(m).then((x) => { m = x; if (cur) cur.m = x; }).catch(() => {}); }, o.pollMs ?? 1000));
    void s.join().catch((e) => { if (my === token) { s.leave(); void o.rooms.leave(m); cur = null; menu(msgOf(e)); } });
    draw();
  }

  function show(): void { root.hidden = false; }
  function hide(): void { root.hidden = true; }
  menu();
  return {
    show() { show(); if (!cur) menu(); },
    hide,
    destroy() { stop(); token++; root.remove(); },
    joinFromUrl() {
      const p = new URLSearchParams(location.search);
      const match = p.get('match');
      if (!match) return false;
      void byCode(`?match=${encodeURIComponent(match)}&invite=${encodeURIComponent(p.get('invite') ?? '')}`);
      return true;
    },
  };
}
