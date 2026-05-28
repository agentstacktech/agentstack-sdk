/**
 * Isolated `import.meta.url` anchor for RNNoise worklet resolution.
 * Jest maps this file to a stub without `import.meta` (see `jest.config.cjs`).
 */
export function workletBundleBaseUrl(): string {
  return import.meta.url;
}
