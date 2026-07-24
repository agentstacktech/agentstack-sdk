/**
 * Strategy Ladder unit tests (`sdk.pwa.update_plane.gen2`).
 */
import {
  resolveSelectedTier,
  tierToApplyMode,
} from '../../src/pwa/appUpdateStrategyLadder';

describe('resolveSelectedTier', () => {
  const base = {
    hasWaitingWorker: false,
    hasServiceWorkerController: false,
    isStandaloneDisplay: false,
    chunkRecoveryAttempted: false,
    priorTierFailed: false,
  };

  it('maps sw_waiting to L0', () => {
    expect(resolveSelectedTier({ ...base, reason: 'sw_waiting' })).toBe(0);
  });

  it('maps build_id + waiting worker to L0 (not L2)', () => {
    expect(
      resolveSelectedTier({
        ...base,
        reason: 'build_id',
        hasWaitingWorker: true,
        hasServiceWorkerController: true,
      }),
    ).toBe(0);
  });

  it('maps build_id + controller without waiting to L2', () => {
    expect(
      resolveSelectedTier({
        ...base,
        reason: 'build_id',
        hasServiceWorkerController: true,
      }),
    ).toBe(2);
  });

  it('maps build_id without controller to L1', () => {
    expect(resolveSelectedTier({ ...base, reason: 'build_id' })).toBe(1);
  });

  it('maps deploy to L1', () => {
    expect(resolveSelectedTier({ ...base, reason: 'deploy' })).toBe(1);
  });

  it('maps stale_assets to L2', () => {
    expect(resolveSelectedTier({ ...base, reason: 'stale_assets' })).toBe(2);
  });

  it('maps chunk recovery to L2', () => {
    expect(
      resolveSelectedTier({
        ...base,
        reason: 'build_id',
        chunkRecoveryAttempted: true,
      }),
    ).toBe(2);
  });

  it('maps priorTierFailed to L2 when no waiting worker', () => {
    expect(
      resolveSelectedTier({
        ...base,
        reason: 'build_id',
        priorTierFailed: true,
      }),
    ).toBe(2);
  });

  it('keeps L0 when waiting even if priorTierFailed', () => {
    expect(
      resolveSelectedTier({
        ...base,
        reason: 'sw_waiting',
        priorTierFailed: true,
        hasWaitingWorker: true,
      }),
    ).toBe(0);
  });

  it('maps deploy + controller without waiting to L2', () => {
    expect(
      resolveSelectedTier({
        ...base,
        reason: 'deploy',
        hasServiceWorkerController: true,
      }),
    ).toBe(2);
  });

  it('tierToApplyMode maps L2 to deep recovery', () => {
    expect(tierToApplyMode(2)).toBe('policy_deep_recovery');
    expect(tierToApplyMode(0)).toBe('user');
    expect(tierToApplyMode(1)).toBe('user');
  });
});
