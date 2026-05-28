import { parseBuildIdFromIndexHtml, probeStaticBuildMismatch } from '../../src/pwa/appUpdatePlane';

describe('probeStaticBuildMismatch', () => {
  it('detects mismatch from build-id.txt', async () => {
    const fetch = jest.fn(async (url: string) => {
      if (url.endsWith('build-id.txt')) {
        return new Response('remote-build', { status: 200 });
      }
      return new Response('', { status: 404 });
    }) as typeof fetch;

    const result = await probeStaticBuildMismatch({
      baseUrl: '/',
      localBuildId: 'local-build',
      fetch,
      probeTimeoutMs: 5000,
    });
    expect(result.mismatch).toBe(true);
    expect(result.remoteBuildId).toBe('remote-build');
    expect(result.source).toBe('build-id.txt');
  });

  it('falls back to index.html embed', async () => {
    const fetch = jest.fn(async (url: string) => {
      if (url.endsWith('build-id.txt')) {
        return new Response('', { status: 404 });
      }
      if (url.endsWith('index.html')) {
        return new Response('VITE_APP_BUILD_ID: "from-html"', { status: 200 });
      }
      return new Response('', { status: 404 });
    }) as typeof fetch;

    const result = await probeStaticBuildMismatch({
      baseUrl: '/app/',
      localBuildId: 'local',
      fetch,
      probeTimeoutMs: 5000,
    });
    expect(result.mismatch).toBe(true);
    expect(result.source).toBe('index.html');
  });
});

describe('parseBuildIdFromIndexHtml', () => {
  it('parses quoted embed', () => {
    expect(parseBuildIdFromIndexHtml('x VITE_APP_BUILD_ID: "abc" y')).toBe('abc');
  });
});
