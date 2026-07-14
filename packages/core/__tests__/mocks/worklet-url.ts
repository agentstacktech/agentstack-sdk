export function workletBundleBaseUrl(): string {
  return 'http://localhost/noise-suppressor-worklet.bundle.js';
}
/** Jest stub — no `import.meta` (CJS runtime cannot parse it). */
export function workletBundleBaseUrl(): string {
  return 'http://localhost/dist/index.esm.js';
}
