/**
 * Optional connection pill: hidden while all is well, otherwise one short plain-language line at the top
 * centre (role=status, aria-live). `mountNetStatus(session, { labels: NET_STATUS_LABELS.ru })` → `{ el, destroy }`.
 */
import { netStatus, type NetStatus } from '../status.js';
import type { Session } from '../session.js';

export interface NetStatusLabels { offline: string; reconnecting: string; hostAway: string; playerAway: string; desync: string; signIn: string; busy: string; unavailable: string }
export const NET_STATUS_LABELS = {
  en: { offline: 'No connection. Trying again…', reconnecting: 'Reconnecting…', hostAway: 'The host lost connection — waiting {s} s', playerAway: '{names} lost connection — waiting', desync: 'Out of sync — fixing it…', signIn: 'Sign in to play online', busy: 'The server asked us to slow down — resuming in a moment…', unavailable: 'Online play is not switched on on the server yet' },
  ru: { offline: 'Нет связи. Пробуем снова…', reconnecting: 'Переподключаемся…', hostAway: 'Ведущий потерял связь — ждём {s} с', playerAway: '{names}: нет связи — ждём', desync: 'Рассинхрон — исправляем…', signIn: 'Чтобы играть онлайн, войдите в аккаунт', busy: 'Сервер просит подождать — продолжим через пару секунд…', unavailable: 'Онлайн-игра ещё не включена на сервере' },
  pt: { offline: 'Sem conexão. Tentando de novo…', reconnecting: 'Reconectando…', hostAway: 'O anfitrião perdeu a conexão — aguardando {s} s', playerAway: '{names} perdeu a conexão — aguardando', desync: 'Fora de sincronia — corrigindo…', signIn: 'Entre na sua conta para jogar online', busy: 'O servidor pediu para esperar — continuamos em instantes…', unavailable: 'O jogo online ainda não está ativado no servidor' },
} as const satisfies Record<string, NetStatusLabels>;

export function describeNetStatus(st: NetStatus, L: NetStatusLabels): string {
  switch (st.kind) {
    case 'offline': return L.offline;
    case 'reconnecting': return L.reconnecting;
    case 'host-away': return L.hostAway.replace('{s}', String(st.seconds));
    case 'player-away': return L.playerAway.replace('{names}', st.names.join(', '));
    case 'desync': return L.desync;
    case 'sign-in': return L.signIn;
    case 'busy': return L.busy;
    case 'unavailable': return L.unavailable;
  }
}

export function mountNetStatus<S, I, V>(session: Session<S, I, V>, o: { labels?: Partial<NetStatusLabels>; parent?: HTMLElement } = {}): { el: HTMLElement; destroy(): void } {
  const L: NetStatusLabels = { ...NET_STATUS_LABELS.en, ...o.labels };
  const parent = o.parent ?? document.body;
  const el = parent.ownerDocument.createElement('div');
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.style.cssText = 'position:fixed;left:50%;top:max(8px,env(safe-area-inset-top));transform:translateX(-50%);z-index:1001;max-width:calc(100% - 24px);'
    + 'padding:8px 14px;border-radius:999px;background:#000d;color:#ffe9b0;font:600 14px/1.3 system-ui,sans-serif;text-align:center;pointer-events:none';
  el.hidden = true;
  parent.append(el);
  const render = () => {
    const st = netStatus(session.snapshot);
    el.hidden = !st;
    if (st) el.textContent = describeNetStatus(st, L);
  };
  const off = session.subscribe(render);
  const tick = setInterval(render, 1000); // own connection changes without new entries
  return { el, destroy() { off(); clearInterval(tick); el.remove(); } };
}
