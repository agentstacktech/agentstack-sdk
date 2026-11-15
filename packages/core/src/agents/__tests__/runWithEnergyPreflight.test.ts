import { describe, expect, it, vi } from 'vitest';

import {
  EnergyInsufficientError,
  preflightPayloadBlocksEnqueue,
  ProviderPreflightBlockedError,
  resolveEnergyPeekMinimum,
  runWithEnergyPreflight,
} from '../runWithEnergyPreflight';

describe('resolveEnergyPeekMinimum', () => {
  it('merges perRunEstimate with minEnergy like preflight_energy_units', () => {
    expect(resolveEnergyPeekMinimum({ minEnergy: 10, perRunEstimate: 80 })).toBe(80);
    expect(resolveEnergyPeekMinimum({ minEnergy: 50, perRunEstimate: 0 })).toBe(50);
    expect(resolveEnergyPeekMinimum({ minEnergy: 0, perRunEstimate: 40 })).toBe(40);
  });
});

describe('preflightPayloadBlocksEnqueue', () => {
  it('blocks unknown usable when preflight implied', () => {
    expect(preflightPayloadBlocksEnqueue({ usable: null })).toBe(true);
  });

  it('allows explicit usable true', () => {
    expect(preflightPayloadBlocksEnqueue({ usable: true, usable_bool: true })).toBe(false);
  });
});

describe('runWithEnergyPreflight', () => {
  it('throws EnergyInsufficientError when below minEnergy', async () => {
    const client = {
      energy: {
        getBalance: vi.fn().mockResolvedValue({ current: 5 }),
      },
      agentsFleet: { forProject: vi.fn() },
      mcp: { execute: vi.fn() },
    } as unknown as Parameters<typeof runWithEnergyPreflight>[0];

    await expect(
      runWithEnergyPreflight(client, { projectId: 1, agentId: 'a', minEnergy: 50 }),
    ).rejects.toBeInstanceOf(EnergyInsufficientError);
  });

  it('throws ProviderPreflightBlockedError on failed batch', async () => {
    const client = {
      energy: undefined,
      mcp: {
        execute: vi.fn().mockResolvedValue({ ok: false, error: 'probe failed', error_code: 'probe_failed' }),
      },
      agentsFleet: { forProject: vi.fn() },
    } as unknown as Parameters<typeof runWithEnergyPreflight>[0];

    await expect(
      runWithEnergyPreflight(client, {
        projectId: 1,
        agentId: 'a',
        preflight: true,
      }),
    ).rejects.toBeInstanceOf(ProviderPreflightBlockedError);
  });
});
