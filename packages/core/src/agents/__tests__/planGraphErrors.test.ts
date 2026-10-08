import {
  isPlanRoleMismatch,
  isPlanRevisionConflict,
  isPlanSpecializationMismatch,
  isPlanWipFull,
} from '../planGraphErrors';

describe('planGraphErrors', () => {
  it('isPlanWipFull detects structured 409', () => {
    expect(
      isPlanWipFull({
        response: { status: 409, data: { error_code: 'wip_full', wip_full: true } },
      }),
    ).toBe(true);
  });

  it('isPlanRevisionConflict ignores wip_full 409', () => {
    expect(
      isPlanRevisionConflict({
        response: { status: 409, data: { error_code: 'wip_full' } },
      }),
    ).toBe(false);
  });

  it('isPlanRoleMismatch detects role_mismatch', () => {
    expect(
      isPlanRoleMismatch({
        response: { data: { error_code: 'role_mismatch' } },
      }),
    ).toBe(true);
  });

  it('isPlanSpecializationMismatch detects specialization_mismatch', () => {
    expect(
      isPlanSpecializationMismatch({
        response: { data: { error_code: 'specialization_mismatch' } },
      }),
    ).toBe(true);
  });
});
