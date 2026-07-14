import { createUpdatePlaneDiagnostics } from '../../src/pwa/updatePlaneDiagnostics';

describe('createUpdatePlaneDiagnostics', () => {
  it('exposes coordinator surface', () => {
    const storage = {
      store: new Map<string, string>(),
      getItem(k: string) {
        return this.store.get(k) ?? null;
      },
      setItem(k: string, v: string) {
        this.store.set(k, v);
      },
    };
    const diag = createUpdatePlaneDiagnostics({
      localBuildId: 'b1',
      storage,
      onApply: async (opts) => {
        await opts.strategy({
          reason: opts.reason,
          mode: opts.mode,
          runSwUpdate: async () => undefined,
          hardReload: () => undefined,
        });
      },
    });
    diag.ingestSignal({ reason: 'sw_waiting' });
    expect(diag.getState().status).toBe('pending');
    expect(diag.shouldShowBanner()).toBe(true);
  });
});
