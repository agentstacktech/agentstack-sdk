import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  isTransientBrowserNetworkError,
  noteTransientNetworkError,
  isRecentTransientNetworkBlip,
} from '../../src/client/networkErrors';
import { probeChunkAssetAvailability } from '../../src/pwa/chunkErrors';

describe('isTransientBrowserNetworkError', () => {
  it('detects Firefox NetworkError TypeError', () => {
    expect(
      isTransientBrowserNetworkError(
        new TypeError('NetworkError when attempting to fetch resource.'),
      ),
    ).toBe(true);
  });

  it('ignores AbortError', () => {
    expect(isTransientBrowserNetworkError(new DOMException('aborted', 'AbortError'))).toBe(false);
  });
});

describe('isRecentTransientNetworkBlip', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { __agentstack_last_network_error_ts: undefined });
    vi.stubGlobal('navigator', { onLine: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns true after noteTransientNetworkError', () => {
    noteTransientNetworkError();
    expect(isRecentTransientNetworkBlip()).toBe(true);
  });
});

describe('probeChunkAssetAvailability', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns missing for 404', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 404, statusText: 'Not Found' })),
    );
    await expect(
      probeChunkAssetAvailability('https://example.com/assets/Foo-abc.js'),
    ).resolves.toBe('missing');
  });

  it('returns transient when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }));
    await expect(
      probeChunkAssetAvailability('https://example.com/assets/Foo-abc.js'),
    ).resolves.toBe('transient');
  });
});
