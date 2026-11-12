/**
 * Default look for a game built on netplay: a dark «premium» page, a centred card that fills the viewport, readable
 * type, big tap keys, a score/turn block — and the lobby + match bar in the same colours (they read the same
 * variables). One call, before mounting anything:
 *
 *   applyTheme();                         // dark (default)
 *   applyTheme({ scheme: 'auto' });       // follow prefers-color-scheme
 *
 * Override any variable in your own CSS: `:root { --np-accent: #7cf; --np-page: #0a1020; }`.
 * Classes: .np-app (page) › .np-stage (card) › .np-title / .np-score / .np-sub / .np-meter>i / .np-keys>.np-key / .np-turn
 */
export interface ThemeOptions {
  /** 'dark' (default), 'light', or 'auto' = follow the system setting. */
  scheme?: 'dark' | 'light' | 'auto';
  doc?: Document;
}

const DARK = `--np-page:radial-gradient(120% 90% at 50% 0%,#2b2118 0%,#15100c 55%,#0b0806 100%);--np-page-solid:#0f0b08;
--np-surface:#1f1812e6;--np-bg:#1f1812;--np-fg:#f6ecd9;--np-muted:#bba98c;--np-line:#ffffff1f;--np-key:#ffffff14;--np-key-hover:#ffffff24;
--np-accent:#f0b545;--np-accent-fg:#1b130b;--np-backdrop:#0009;--np-shadow:0 24px 60px #000a,0 2px 0 #ffffff0d inset;color-scheme:dark`;
const LIGHT = `--np-page:radial-gradient(120% 90% at 50% 0%,#fffaf0 0%,#f3e9d7 60%,#e9dcc4 100%);--np-page-solid:#f3e9d7;
--np-surface:#fffdf8f0;--np-bg:#fffdf8;--np-fg:#2a1f14;--np-muted:#7a6a52;--np-line:#0000001a;--np-key:#0000000d;--np-key-hover:#0000001a;
--np-accent:#c98a17;--np-accent-fg:#fff;--np-backdrop:#2a1f1466;--np-shadow:0 24px 60px #5a40202e;color-scheme:light`;

export function themeCss(scheme: ThemeOptions['scheme'] = 'dark'): string {
  const vars = scheme === 'light' ? `:root{${LIGHT}}` : scheme === 'auto' ? `:root{${DARK}}@media (prefers-color-scheme:light){:root{${LIGHT}}}` : `:root{${DARK}}`;
  return `${vars}
:root{--np-font:ui-rounded,"SF Pro Rounded","Segoe UI",system-ui,-apple-system,Roboto,sans-serif;--np-radius:22px}
html,body{margin:0;min-height:100%;background:var(--np-page-solid);background-image:var(--np-page);background-attachment:fixed;color:var(--np-fg);
 font:16px/1.45 var(--np-font);-webkit-font-smoothing:antialiased;-webkit-tap-highlight-color:transparent}
*,*::before,*::after{box-sizing:border-box}
.np-app{min-height:100dvh;display:grid;place-items:center;padding:max(64px,calc(env(safe-area-inset-top) + 56px)) 16px max(170px,calc(env(safe-area-inset-bottom) + 160px))}
.np-stage{width:min(460px,100%);display:flex;flex-direction:column;align-items:center;gap:18px;padding:28px 22px 24px;text-align:center;
 background:var(--np-surface);border:1px solid var(--np-line);border-radius:var(--np-radius);box-shadow:var(--np-shadow);backdrop-filter:blur(8px)}
.np-title{margin:0;font-size:13px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:var(--np-muted)}
.np-score{margin:0;font-size:clamp(72px,22vw,120px);font-weight:800;line-height:1;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.np-score small{font-size:.32em;font-weight:600;color:var(--np-muted);letter-spacing:0;margin-left:.15em}
.np-sub{margin:0;min-height:1.45em;font-size:18px;font-weight:600}
.np-turn{color:var(--np-accent)}
.np-meter{width:100%;height:10px;border-radius:999px;background:var(--np-key);overflow:hidden}
.np-meter>i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--np-accent),color-mix(in srgb,var(--np-accent) 60%,#fff));transition:width .35s ease}
.np-keys{width:100%;display:grid;grid-template-columns:repeat(auto-fit,minmax(88px,1fr));gap:10px}
.np-key{min-height:64px;min-width:44px;border:1px solid var(--np-line);border-radius:16px;background:var(--np-key);color:inherit;font:800 24px var(--np-font);
 cursor:pointer;transition:transform .08s ease,background .15s ease,opacity .15s ease}
.np-key:hover:not(:disabled){background:var(--np-key-hover)}
.np-key:active:not(:disabled){transform:scale(.96)}
.np-key.np-main,.np-keys.np-live .np-key:not(:disabled){background:var(--np-accent);color:var(--np-accent-fg);border-color:transparent;box-shadow:0 6px 18px color-mix(in srgb,var(--np-accent) 35%,transparent)}
.np-key:disabled{opacity:.38;cursor:default}
.np-key:focus-visible{outline:3px solid var(--np-accent);outline-offset:3px}
@media (prefers-reduced-motion:reduce){.np-key,.np-meter>i{transition:none}}`;
}

/** Inject the theme once (id `np-theme-css`); calling again switches the scheme. */
export function applyTheme(o: ThemeOptions = {}): void {
  const doc = o.doc ?? document;
  let st = doc.getElementById('np-theme-css') as HTMLStyleElement | null;
  if (!st) { st = doc.createElement('style'); st.id = 'np-theme-css'; doc.head.prepend(st); } // first: game CSS overrides it
  st.textContent = themeCss(o.scheme);
}
