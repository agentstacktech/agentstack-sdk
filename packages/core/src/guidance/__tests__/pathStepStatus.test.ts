import { applyStepSkip, canFocusStep, markStepDone } from '../types/pathStepStatus';

describe('pathStepStatus', () => {
  it('canFocus available and current', () => {
    expect(canFocusStep('available')).toBe(true);
    expect(canFocusStep('current')).toBe(true);
    expect(canFocusStep('locked')).toBe(false);
  });

  it('markStepDone preserves skipped', () => {
    expect(markStepDone('skipped')).toBe('skipped');
    expect(markStepDone('available')).toBe('done');
  });

  it('applyStepSkip', () => {
    expect(applyStepSkip('available')).toBe('skipped');
  });
});
