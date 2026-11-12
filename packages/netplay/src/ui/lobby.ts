/**
 * Optional minimal room-code screen for `createLobby` (`@agentstack/netplay/ui`). Plain DOM, no framework,
 * mobile-first (48 px targets, 16 px+ inputs, one column, safe-area padding). Opens as a modal <dialog> (top layer, focus trap, Esc = back). Theme with CSS variables on the
 * container: --np-bg, --np-fg, --np-accent, --np-accent-fg, --np-muted, --np-font.
 *
 *   const ui = mountLobby(document.body, lobby, { labels: LOBBY_LABELS.ru, title: 'Дань', onClose: showMenu });
 *   ui.destroy();
 */
import type { LobbyController, LobbyState } from '../lobby.js';

export interface LobbyLabels {
  title: string; create: string; createHint: string; join: string; joinHint: string; codePlaceholder: string; joinGo: string;
  back: string; leave: string; yourCode: string; shareHint: string; copy: string; copied: string; share: string;
  players: string; you: string; waitingMore: string; start: string; waitingStart: string; ready: string;
  badCode: string; offline: string; version: string; signIn: string; unavailable: string; close: string;
}
const en: LobbyLabels = {
  title: 'Play with friends', create: 'Create a room', createHint: 'You get a code to send to friends', join: 'Join with a code',
  joinHint: 'Type the code a friend sent you', codePlaceholder: 'e.g. K7MQ2X', joinGo: 'Join', back: 'Back', leave: 'Leave room',
  yourCode: 'Room code', shareHint: 'Send this code or the link to your friends', copy: 'Copy invite link', copied: 'Link copied',
  share: 'Share…', players: 'Players', you: 'you', waitingMore: 'Waiting for players… ({n} of {min} needed)', start: 'Start the game',
  waitingStart: 'Waiting for everyone to press Start…', ready: 'ready', badCode: 'That code doesn’t look right. Codes have 6 letters and digits.',
  offline: 'Can’t reach the game server. Check your connection and try again.', version: 'Your friend has a different version of the game. Both of you should reload the page.',
  signIn: 'Online play needs an account. Sign in, then try again.', unavailable: 'Online play is not switched on on the server yet. Try again later.',
  close: 'Close',
};
const ru: LobbyLabels = {
  title: 'Игра с друзьями', create: 'Создать комнату', createHint: 'Вы получите код для друзей', join: 'Войти по коду',
  joinHint: 'Введите код, который прислал друг', codePlaceholder: 'например K7MQ2X', joinGo: 'Войти', back: 'Назад', leave: 'Выйти из комнаты',
  yourCode: 'Код комнаты', shareHint: 'Отправьте друзьям этот код или ссылку', copy: 'Скопировать ссылку', copied: 'Ссылка скопирована',
  share: 'Поделиться…', players: 'Игроки', you: 'вы', waitingMore: 'Ждём игроков… (нужно {min}, сейчас {n})', start: 'Начать игру',
  waitingStart: 'Ждём, пока все нажмут «Начать»…', ready: 'готов', badCode: 'Код не подходит: в нём 6 букв и цифр.',
  offline: 'Нет связи с игровым сервером. Проверьте интернет и попробуйте ещё раз.', version: 'У друга другая версия игры. Обновите страницу оба.',
  signIn: 'Для игры онлайн нужен аккаунт. Войдите и попробуйте ещё раз.', unavailable: 'Онлайн-игра ещё не включена на сервере. Попробуйте позже.',
  close: 'Закрыть',
};
const pt: LobbyLabels = {
  title: 'Jogar com amigos', create: 'Criar sala', createHint: 'Você recebe um código para enviar aos amigos', join: 'Entrar com código',
  joinHint: 'Digite o código que seu amigo enviou', codePlaceholder: 'ex.: K7MQ2X', joinGo: 'Entrar', back: 'Voltar', leave: 'Sair da sala',
  yourCode: 'Código da sala', shareHint: 'Envie este código ou o link para seus amigos', copy: 'Copiar link de convite', copied: 'Link copiado',
  share: 'Compartilhar…', players: 'Jogadores', you: 'você', waitingMore: 'Aguardando jogadores… ({n} de {min})', start: 'Começar o jogo',
  waitingStart: 'Aguardando todos apertarem Começar…', ready: 'pronto', badCode: 'Esse código não parece certo. Códigos têm 6 letras e números.',
  offline: 'Sem conexão com o servidor do jogo. Verifique a internet e tente de novo.', version: 'Seu amigo tem outra versão do jogo. Recarreguem a página.',
  signIn: 'O jogo online precisa de uma conta. Entre e tente de novo.', unavailable: 'O jogo online ainda não está ativado no servidor. Tente mais tarde.',
  close: 'Fechar',
};
export const LOBBY_LABELS = { en, ru, pt } as const;

export interface MountLobbyOptions {
  labels?: Partial<LobbyLabels>;
  /** Heading override (e.g. the game name). */
  title?: string;
  /** Show a close button on the menu screen. */
  onClose?: () => void;
  /** Extra plain-language line on the waiting screen (e.g. «Empty seats are played by bots»). */
  note?: string;
  /** Hide the overlay automatically when the match starts. Default true. */
  hideOnStart?: boolean;
}
export interface LobbyUi { readonly el: HTMLElement; show(): void; hide(): void; destroy(): void }

const CSS = `
.np-lobby{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:max(16px,env(safe-area-inset-top)) 16px max(16px,env(safe-area-inset-bottom));
 background:var(--np-backdrop,#000b);font:16px/1.4 var(--np-font,system-ui,sans-serif);color:var(--np-fg,#f4ead6);
 margin:0;border:0;width:100%;height:100%;max-width:none;max-height:none;box-sizing:border-box}
.np-lobby::backdrop{background:transparent}
.np-lobby:not([open]){display:none}
.np-card{width:100%;max-width:420px;max-height:100%;overflow:auto;background:var(--np-bg,#211a14);border-radius:16px;padding:20px;box-shadow:0 10px 40px #0008;display:flex;flex-direction:column;gap:12px}
.np-card h2{margin:0 0 4px;font-size:20px}
.np-hint{margin:-6px 0 0;color:var(--np-muted,#bfae93);font-size:14px}
.np-btn{min-height:48px;border:0;border-radius:12px;padding:10px 16px;font:inherit;font-weight:600;cursor:pointer;background:#ffffff1a;color:inherit;width:100%}
.np-btn.np-main{background:var(--np-accent,#e0a33a);color:var(--np-accent-fg,#1b130b)}
.np-btn:disabled{opacity:.5;cursor:default}
.np-btn:focus-visible,.np-input:focus-visible{outline:3px solid var(--np-accent,#e0a33a);outline-offset:2px}
.np-row{display:flex;gap:8px}.np-row>*{flex:1}
.np-input{min-height:48px;border-radius:12px;border:2px solid #ffffff33;background:#0004;color:inherit;font:inherit;font-size:20px;letter-spacing:.15em;text-align:center;text-transform:uppercase;padding:8px;width:100%;box-sizing:border-box}
.np-code{font-size:36px;font-weight:800;letter-spacing:.2em;text-align:center;padding:8px;border-radius:12px;background:#0004;user-select:all}
.np-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.np-list li{display:flex;justify-content:space-between;padding:8px 12px;border-radius:10px;background:#ffffff0d}
.np-msg{min-height:1.4em;color:var(--np-muted,#bfae93);font-size:14px;text-align:center}
.np-err{color:#ff9b8a}`;

export function mountLobby<S, I, V>(parent: HTMLElement, lobby: LobbyController<S, I, V>, o: MountLobbyOptions = {}): LobbyUi {
  const L: LobbyLabels = { ...en, ...o.labels };
  const doc = parent.ownerDocument;
  if (!doc.getElementById('np-lobby-css')) {
    const st = doc.createElement('style');
    st.id = 'np-lobby-css';
    st.textContent = CSS;
    doc.head.append(st);
  }
  // a modal <dialog> lives in the browser top layer: it stacks above the game's own modal dialogs, traps focus and gets Esc
  const root = doc.createElement('dialog');
  root.className = 'np-lobby';
  root.setAttribute('aria-modal', 'true');
  const open = () => { if (root.open) return; if (typeof root.showModal === 'function' && root.isConnected) root.showModal(); else root.setAttribute('open', ''); };
  const close = () => { if (typeof root.close === 'function') root.close(); else root.removeAttribute('open'); };
  root.addEventListener('cancel', (e) => {
    e.preventDefault(); // Esc: back out one step instead of hiding a live room
    const st = lobby.state;
    if (st.screen === 'error') lobby.back();
    else if (st.screen === 'menu' && joining) { joining = false; render(lobby.state); }
    else if (st.screen === 'menu' && o.onClose) o.onClose();
  });
  const card = doc.createElement('div');
  card.className = 'np-card';
  root.append(card);
  parent.append(root);
  let joining = false;
  open();
  let msg = '';
  let lastScreen = '';

  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, unknown> = {}, ...kids: (Node | string | null)[]) => {
    const e = doc.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v as EventListener);
      else if (v !== undefined && v !== false) e.setAttribute(k, v === true ? '' : String(v));
    }
    for (const k of kids) if (k !== null) e.append(k);
    return e;
  };
  const btn = (label: string, on: () => void, main = false, disabled = false) =>
    el('button', { type: 'button', class: main ? 'np-btn np-main' : 'np-btn', onclick: on, disabled }, label);
  const fmt = (s: string, v: Record<string, number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ''));

  const copy = async (link: string) => {
    try { await navigator.clipboard.writeText(link); msg = L.copied; } catch {
      const ta = el('textarea', { readonly: true }) as HTMLTextAreaElement;
      ta.value = link; card.append(ta); ta.select();
      try { msg = doc.execCommand('copy') ? L.copied : link; } catch { msg = link; }
      ta.remove();
    }
    render(lobby.state);
  };

  const render = (s: LobbyState) => {
    if (s.screen !== lastScreen) { msg = ''; lastScreen = s.screen; }
    card.replaceChildren();
    card.append(el('h2', {}, o.title ?? L.title));
    if (s.screen === 'menu') {
      if (!joining) {
        card.append(btn(L.create, () => lobby.create(), true), el('p', { class: 'np-hint' }, L.createHint),
          btn(L.join, () => { joining = true; render(lobby.state); }), el('p', { class: 'np-hint' }, L.joinHint));
        if (o.onClose) card.append(btn(L.close, o.onClose));
      } else {
        const input = el('input', { class: 'np-input', 'aria-label': L.join, placeholder: L.codePlaceholder, autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', enterkeyhint: 'go', maxlength: '200' }) as HTMLInputElement;
        const go = () => { if (input.value.trim()) { joining = false; lobby.join(input.value); } };
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
        card.append(el('p', { class: 'np-hint' }, L.joinHint), input, el('div', { class: 'np-row' }, btn(L.back, () => { joining = false; render(lobby.state); }), btn(L.joinGo, go, true)));
        queueMicrotask(() => input.focus());
      }
    } else if (s.screen === 'waiting') {
      const seated = s.players.filter((p) => p.status !== 'left');
      card.append(el('p', { class: 'np-hint' }, L.yourCode), el('div', { class: 'np-code', 'aria-live': 'polite' }, s.code ?? ''), el('p', { class: 'np-hint' }, L.shareHint));
      const share = (navigator as Navigator & { share?: (d: ShareData) => Promise<void> }).share;
      card.append(el('div', { class: 'np-row' }, btn(L.copy, () => void copy(s.link ?? '')), share ? btn(L.share, () => void share.call(navigator, { url: s.link ?? '', title: o.title ?? L.title }).catch(() => undefined)) : null));
      card.append(el('h2', {}, `${L.players} · ${seated.length}/${s.max}`));
      const self = lobby.session?.snapshot.self;
      card.append(el('ul', { class: 'np-list' }, ...seated.map((p) => el('li', {}, `${p.name}${p.id === self ? ` (${L.you})` : ''}`, p.ready ? `✓ ${L.ready}` : ''))));
      if (o.note) card.append(el('p', { class: 'np-hint' }, o.note));
      if (seated.length < s.min) card.append(el('p', { class: 'np-msg' }, fmt(L.waitingMore, { n: seated.length, min: s.min })));
      else if (s.ready) card.append(el('p', { class: 'np-msg' }, L.waitingStart));
      card.append(btn(L.start, () => lobby.start(), true, !s.canStart), btn(L.leave, () => lobby.cancel()));
    } else if (s.screen === 'error') {
      card.append(el('p', { class: 'np-err', role: 'alert' }, s.error === 'bad-code' ? L.badCode : s.error === 'version' ? L.version : s.error === 'sign-in' ? L.signIn : s.error === 'unavailable' ? L.unavailable : L.offline), btn(L.back, () => lobby.back(), true));
    }
    if (msg) card.append(el('p', { class: 'np-msg', 'aria-live': 'polite' }, msg));
    if (s.screen === 'playing' && (o.hideOnStart ?? true)) close();
  };
  const off = lobby.subscribe(render);
  return {
    el: root,
    show() { open(); render(lobby.state); },
    hide() { close(); },
    destroy() { off(); close(); root.remove(); },
  };
}
