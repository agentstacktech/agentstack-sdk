import {
  clearProbeStaticBuildCache,
  probeStaticBuildMismatch,
} from '../appUpdatePlane';

describe('probeStaticBuildMismatch TTL cache', () => {
  beforeEach(() => {
    clearProbeStaticBuildCache();
  });

  it('reuses result within TTL without second fetch', async () => {
    const fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'text/plain' },
      text: async () => '0.4.13-t9999',
    });
    const input = { baseUrl: '/', localBuildId: '0.4.13-t1000', fetch: fetch as typeof fetch };

    await probeStaticBuildMismatch(input);
    await probeStaticBuildMismatch(input);

    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
