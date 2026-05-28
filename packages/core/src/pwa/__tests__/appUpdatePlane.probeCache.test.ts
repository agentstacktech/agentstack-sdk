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
      text: async () => 'remote-build',
    });
    const input = { baseUrl: '/', localBuildId: 'local', fetch: fetch as typeof fetch };

    await probeStaticBuildMismatch(input);
    await probeStaticBuildMismatch(input);

    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
