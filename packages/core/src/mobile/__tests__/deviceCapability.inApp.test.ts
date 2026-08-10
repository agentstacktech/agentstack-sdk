import { describe, expect, it, vi, afterEach } from 'vitest';
import { isInAppBrowserUa } from '../deviceCapability';

describe('isInAppBrowserUa', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('detects Instagram / WebView tokens', () => {
    expect(isInAppBrowserUa('Mozilla/5.0 Instagram')).toBe(true);
    expect(isInAppBrowserUa('Chrome Mobile ; wv)')).toBe(true);
  });

  it('rejects normal desktop Chrome', () => {
    expect(
      isInAppBrowserUa(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
      ),
    ).toBe(false);
  });
});
