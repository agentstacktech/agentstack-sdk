import {
  probeGenerationSupplyGate,
  sandboxApplyReadyFromGate,
} from '../generationGateProbe';

describe('generationGateProbe', () => {
  it('sandboxApplyReadyFromGate respects apply_ready', () => {
    expect(sandboxApplyReadyFromGate({ apply_ready: true })).toBe(true);
    expect(sandboxApplyReadyFromGate({ apply_ready: false })).toBe(false);
    expect(sandboxApplyReadyFromGate(undefined)).toBe(false);
  });

  it('probeGenerationSupplyGate delegates to generations client', async () => {
    const payload = {
      project_id: 42,
      supply_scope: 'gate' as const,
      auto_generation_mode: true,
      canary_auto_route: false,
      traffic_weight: 0,
      pending_count: 0,
      settings: {},
      sandbox_gate: { apply_ready: false, reason: 'no_open_anchor' },
    };
    const client = {
      getStatus: jest.fn().mockResolvedValue(payload),
    };
    await expect(probeGenerationSupplyGate(client, 42)).resolves.toEqual(payload);
    expect(client.getStatus).toHaveBeenCalledWith(42, undefined);
  });

  it('probeGenerationSupplyGate forwards envUuid to client', async () => {
    const client = {
      getStatus: jest.fn().mockResolvedValue({
        project_id: 42,
        auto_generation_mode: false,
        canary_auto_route: false,
        traffic_weight: 0,
        pending_count: 0,
        settings: {},
      }),
    };
    await probeGenerationSupplyGate(client, 42, 'fork-anchor');
    expect(client.getStatus).toHaveBeenCalledWith(42, 'fork-anchor');
  });
});
