import { applyPromoteGatesPolicy, resolveRequireGatesPassed } from '../promotePolicy';

describe('promotePolicy', () => {
  it('resolveRequireGatesPassed honors explicit false', () => {
    expect(resolveRequireGatesPassed(false, { auto_generation_mode: true })).toBe(false);
  });

  it('resolveRequireGatesPassed defaults true when mode on', () => {
    expect(resolveRequireGatesPassed(undefined, { auto_generation_mode: true })).toBe(true);
  });

  it('resolveRequireGatesPassed respects opt-out policy', () => {
    expect(
      resolveRequireGatesPassed(undefined, {
        auto_generation_mode: true,
        require_gates_passed_on_promote: false,
      }),
    ).toBe(false);
  });

  it('applyPromoteGatesPolicy leaves body when mode off', () => {
    const out = applyPromoteGatesPolicy({ env_uuid: 'x' }, { auto_generation_mode: false });
    expect(out.require_gates_passed).toBeUndefined();
  });

  it('applyPromoteGatesPolicy sets gates when mode on', () => {
    const out = applyPromoteGatesPolicy({ env_uuid: 'x' }, { auto_generation_mode: true });
    expect(out.require_gates_passed).toBe(true);
  });
});
