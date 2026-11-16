/**
 * Corner dock for in-game net UI (`@agentstack/netplay/ui`). Collapsible panel for match bar + status
 * so canvas games (e.g. Nahual pid 2185) keep the playfield clear.
 */
import type { Session } from '../session.js';
import type { MatchBarOptions } from './matchbar.js';
import { mountMatchBar } from './matchbar.js';
import { mountNetStatus, type NetStatusLabels } from './status.js';
import { netStatus } from '../status.js';
import { bindVisibility } from './visibility.js';

export type NetDockCorner = 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end';

export interface NetDockPlayingPolicy {
  startCollapsed?: boolean;
  quietWhileCollapsed?: boolean;
  corner?: NetDockCorner;
  zIndex?: number;
}

export interface MountNetDockLabels {
  toggle: string;
  panel: string;
  expand: string;
  collapse: string;
}

const DOCK_LABELS = {
  en: { toggle: 'Network', panel: 'Network', expand: 'Show network panel', collapse: 'Hide network panel' },
  ru: { toggle: 'Сеть', panel: 'Сеть', expand: 'Показать сеть', collapse: 'Скрыть сеть' },
  pt: { toggle: 'Rede', panel: 'Rede', expand: 'Mostrar rede', collapse: 'Ocultar rede' },
} as const;

export interface MountNetDockOptions<S, I, V> {
  parent?: HTMLElement;
  labels?: Partial<MountNetDockLabels>;
  session: Session<S, I, V>;
  matchBar?: Omit<MatchBarOptions, 'parent' | 'quiet' | 'position'>;
  netStatus?: { labels?: Partial<NetStatusLabels> };
  playing?: NetDockPlayingPolicy;
  collapseOnPlay?: boolean;
  bindVisibility?: boolean;
}

export interface NetDockUi {
  readonly el: HTMLElement;
  readonly collapsed: boolean;
  expand(): void;
  collapse(): void;
  destroy(): void;
}

const DOCK_CSS = `
.np-dock-host{position:fixed;z-index:var(--np-dock-z,1000);display:flex;flex-direction:column;gap:8px;max-width:min(340px,calc(100vw - 20px));pointer-events:none;font:600 14px/1.3 system-ui,sans-serif;color:var(--np-fg,#f4ead6)}
.np-dock-host.np-tl{top:max(10px,env(safe-area-inset-top));left:max(10px,env(safe-area-inset-left));align-items:flex-start}
.np-dock-host.np-tr{top:max(10px,env(safe-area-inset-top));right:max(10px,env(safe-area-inset-right));align-items:flex-end}
.np-dock-host.np-bl{bottom:max(10px,env(safe-area-inset-bottom));left:max(10px,env(safe-area-inset-left));align-items:flex-start}
.np-dock-host.np-br{bottom:max(10px,env(safe-area-inset-bottom));right:max(10px,env(safe-area-inset-right));align-items:flex-end}
.np-dock-fab{pointer-events:auto;min-width:48px;min-height:48px;padding:0 14px;border:0;border-radius:999px;cursor:pointer;
 background:var(--np-bg,#211a14e6);color:inherit;box-shadow:0 4px 16px #0006;display:inline-flex;align-items:center;gap:8px}
.np-dock-fab:focus-visible{outline:3px solid var(--np-accent,#e0a33a);outline-offset:2px}
.np-dock-fab[data-alert="1"]{outline:2px solid #ff9b8a}
.np-dock-panel{pointer-events:auto;display:flex;flex-direction:column;gap:6px;width:100%;max-height:min(42vh,280px);overflow:auto;
 background:var(--np-bg,#211a14f0);border-radius:16px;padding:10px;box-shadow:0 8px 28px #0008;border:1px solid #ffffff14}
.np-dock-panel[hidden]{display:none!important}
.np-dock-panel .np-bar{position:static!important;left:auto!important;right:auto!important;top:auto!important;transform:none!important;width:100%!important;
 padding:0!important;flex-direction:column;align-items:stretch;box-shadow:none;background:transparent}
.np-dock-panel .np-bar.np-ended{width:100%!important}
.np-dock-panel .np-chip{white-space:normal;text-align:left}
.np-dock-status{font-size:13px;font-weight:600;text-align:center;color:var(--np-muted,#bfae93);min-height:1.2em}
`.trim();

function cornerClass(c: NetDockCorner): string {
  switch (c) {
    case 'top-start': return 'np-tl';
    case 'top-end': return 'np-tr';
    case 'bottom-start': return 'np-bl';
  }
  return 'np-br';
}

export function mountNetDock<S, I, V>(parent: HTMLElement, o: MountNetDockOptions<S, I, V>): NetDockUi {
  const policy = o.playing ?? {};
  const corner = policy.corner ?? 'bottom-end';
  const z = policy.zIndex ?? 1000;
  const startCollapsed = policy.startCollapsed !== false;
  const quietWhileCollapsed = policy.quietWhileCollapsed !== false;
  const collapseOnPlay = o.collapseOnPlay !== false;
  const L: MountNetDockLabels = { ...DOCK_LABELS.en, ...o.labels };

  const doc = parent.ownerDocument;
  if (!doc.getElementById('np-dock-css')) {
    const st = doc.createElement('style');
    st.id = 'np-dock-css';
    st.textContent = DOCK_CSS;
    doc.head.append(st);
  }

  const host = doc.createElement('div');
  host.className = `np-dock-host ${cornerClass(corner)}`;
  host.style.setProperty('--np-dock-z', String(z));

  const fab = doc.createElement('button');
  fab.type = 'button';
  fab.className = 'np-dock-fab';
  fab.textContent = L.toggle;

  const panel = doc.createElement('div');
  panel.className = 'np-dock-panel';
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-label', L.panel);
  panel.hidden = true;

  const statusSlot = doc.createElement('div');
  statusSlot.className = 'np-dock-status';
  const barSlot = doc.createElement('div');
  panel.append(statusSlot, barSlot);
  host.append(fab, panel);
  parent.append(host);

  let collapsed = true;

  const barMountOpts: MatchBarOptions & { parent?: HTMLElement } = {
    ...o.matchBar,
    parent: barSlot,
    position: 'bottom',
    quiet: quietWhileCollapsed,
  };
  const barUi = mountMatchBar(o.session, barMountOpts);

  const statusUi = mountNetStatus(o.session, { ...o.netStatus, parent: statusSlot });
  statusUi.el.hidden = true;

  const offVis = o.bindVisibility !== false ? bindVisibility(o.session, doc) : () => {};

  let lastPhase = o.session.snapshot.phase;

  const setCollapsed = (v: boolean) => {
    collapsed = v;
    panel.hidden = collapsed;
    fab.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    fab.setAttribute('aria-label', collapsed ? L.expand : L.collapse);
    barMountOpts.quiet = collapsed && quietWhileCollapsed;
    const bar = barUi.el.querySelector('.np-bar') as HTMLElement | null;
    if (bar && barMountOpts.quiet) {
      const m = barUi.model;
      bar.hidden = !m.spectator && !m.end && !m.alert;
    } else if (bar) bar.hidden = false;
  };

  fab.setAttribute('aria-controls', panel.id || 'np-dock-panel');
  if (!panel.id) panel.id = `np-dock-panel-${Math.random().toString(36).slice(2, 8)}`;
  fab.setAttribute('aria-controls', panel.id);
  fab.onclick = () => setCollapsed(!collapsed);

  const onSnap = () => {
    const snap = o.session.snapshot;
    const st = netStatus(snap);
    const alert = !!st || barUi.model.alert;
    fab.dataset.alert = alert ? '1' : '0';
    statusSlot.textContent = st ? statusUi.el.textContent ?? '' : '';
    const phase = snap.phase;
    if (collapseOnPlay && phase === 'playing' && lastPhase !== 'playing' && startCollapsed) setCollapsed(true);
    if (phase === 'over' && collapsed) setCollapsed(false);
    lastPhase = phase;
    if (collapsed && quietWhileCollapsed) {
      barMountOpts.quiet = true;
      const bar = barUi.el.querySelector('.np-bar') as HTMLElement | null;
      if (bar) bar.hidden = !barUi.model.spectator && !barUi.model.end && !barUi.model.alert;
    }
  };

  const unsub = o.session.subscribe(onSnap);
  const tick = setInterval(onSnap, 400);

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape' || collapsed) return;
    e.preventDefault();
    setCollapsed(true);
  };
  doc.addEventListener('keydown', onKey);

  if (!(startCollapsed && o.session.snapshot.phase === 'playing')) setCollapsed(false);
  else setCollapsed(true);
  onSnap();

  return {
    el: host,
    get collapsed() { return collapsed; },
    expand: () => setCollapsed(false),
    collapse: () => setCollapsed(true),
    destroy() {
      unsub();
      clearInterval(tick);
      offVis();
      doc.removeEventListener('keydown', onKey);
      barUi.destroy();
      statusUi.destroy();
      host.remove();
    },
  };
}

export { DOCK_LABELS };