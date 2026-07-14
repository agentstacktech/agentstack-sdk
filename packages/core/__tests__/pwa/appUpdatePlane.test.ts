import {
  clearProbeStaticBuildCache,
  probeStaticBuildMismatch,
} from '../../src/pwa/appUpdatePlane';
import {
  isValidBuildId,
  parseBuildIdFromIndexHtml,
  parseBuildMetaJson,
} from '../../src/pwa/buildId';

const LOCAL = '0.4.13-t1000';
const REMOTE = '0.4.13-t2000';

function mockResponse(
  body: string,
  opts: { status?: number; contentType?: string } = {},
): Response {
  const headers = new Headers();
  if (opts.contentType) headers.set('content-type', opts.contentType);
  return new Response(body, { status: opts.status ?? 200, headers });
}

describe('isValidBuildId', () => {
  it('accepts platform build ids', () => {
    expect(isValidBuildId('0.4.13-t1782201601275')).toBe(true);
    expect(isValidBuildId('dev-local')).toBe(true);
  });

  it('rejects html and empty', () => {
    expect(isValidBuildId('')).toBe(false);
    expect(isValidBuildId('<html>')).toBe(false);
    expect(isValidBuildId('   ')).toBe(false);
  });
});

describe('probeStaticBuildMismatch', () => {
  beforeEach(() => {
    clearProbeStaticBuildCache();
  });

  it('detects mismatch from build-id.txt', async () => {
    const fetch = jest.fn(async (url: string) => {
      if (url.endsWith('build-id.txt')) {
        return mockResponse(REMOTE, { contentType: 'text/plain' });
      }
      return mockResponse('', { status: 404 });
    }) as typeof fetch;

    const result = await probeStaticBuildMismatch({
      baseUrl: '/',
      localBuildId: LOCAL,
      fetch,
      probeTimeoutMs: 5000,
    });
    expect(result.mismatch).toBe(true);
    expect(result.remoteBuildId).toBe(REMOTE);
    expect(result.source).toBe('build-id.txt');
  });

  it('returns invalid when build-id.txt is HTML', async () => {
    const fetch = jest.fn(async (url: string) => {
      if (url.endsWith('build-id.txt')) {
        return mockResponse('<!doctype html><html></html>', { contentType: 'text/html' });
      }
      return mockResponse('', { status: 404 });
    }) as typeof fetch;

    const result = await probeStaticBuildMismatch({
      baseUrl: '/',
      localBuildId: LOCAL,
      fetch,
    });
    expect(result.mismatch).toBe(false);
    expect(result.source).toBe('invalid');
  });

  it('falls back to build-meta.json', async () => {
    const meta = JSON.stringify({
      buildId: REMOTE,
      builtAt: '2026-06-01T00:00:00.000Z',
      gitSha: 'abc',
      coreVersion: '0.4.13',
      minSupportedBuildId: null,
    });
    const fetch = jest.fn(async (url: string) => {
      if (url.endsWith('build-id.txt')) return mockResponse('', { status: 404 });
      if (url.endsWith('build-meta.json')) {
        return mockResponse(meta, { contentType: 'application/json' });
      }
      return mockResponse('', { status: 404 });
    }) as typeof fetch;

    const result = await probeStaticBuildMismatch({
      baseUrl: '/app/',
      localBuildId: LOCAL,
      fetch,
    });
    expect(result.mismatch).toBe(true);
    expect(result.source).toBe('build-meta.json');
    expect(result.remoteBuildMeta?.buildId).toBe(REMOTE);
  });

  it('falls back to index.html meta tag', async () => {
    const html = `<html><head><meta name="agentstack:build-id" content="${REMOTE}"></head></html>`;
    const fetch = jest.fn(async (url: string) => {
      if (url.endsWith('build-id.txt') || url.endsWith('build-meta.json')) {
        return mockResponse('', { status: 404 });
      }
      if (url.endsWith('index.html')) {
        return mockResponse(html, { contentType: 'text/html' });
      }
      return mockResponse('', { status: 404 });
    }) as typeof fetch;

    const result = await probeStaticBuildMismatch({
      baseUrl: '/app/',
      localBuildId: LOCAL,
      fetch,
    });
    expect(result.mismatch).toBe(true);
    expect(result.source).toBe('index.html');
  });

  it('returns none when all probes miss', async () => {
    const fetch = jest.fn(async () => mockResponse('', { status: 404 })) as typeof fetch;
    const result = await probeStaticBuildMismatch({
      baseUrl: '/',
      localBuildId: LOCAL,
      fetch,
    });
    expect(result.mismatch).toBe(false);
    expect(result.source).toBe('none');
  });
});

describe('parseBuildIdFromIndexHtml', () => {
  it('parses meta tag', () => {
    expect(
      parseBuildIdFromIndexHtml(
        '<meta name="agentstack:build-id" content="0.4.13-t999">',
      ),
    ).toBe('0.4.13-t999');
  });

  it('parses legacy embed when valid', () => {
    expect(parseBuildIdFromIndexHtml('x VITE_APP_BUILD_ID: "0.4.13-t1" y')).toBe('0.4.13-t1');
  });
});

describe('parseBuildMetaJson', () => {
  it('parses valid payload', () => {
    const meta = parseBuildMetaJson(
      JSON.stringify({
        buildId: REMOTE,
        builtAt: '2026-06-01T00:00:00.000Z',
        gitSha: null,
        coreVersion: '0.4.13',
        minSupportedBuildId: '0.4.12-t1',
      }),
    );
    expect(meta?.buildId).toBe(REMOTE);
    expect(meta?.minSupportedBuildId).toBe('0.4.12-t1');
  });
});
