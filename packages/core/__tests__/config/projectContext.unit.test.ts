import {
  normalizeProjectId,
  resolveEffectiveProjectId,
} from '../../src/config/projectContext';

describe('projectContext', () => {
  it('normalizeProjectId accepts positive integers', () => {
    expect(normalizeProjectId(42)).toBe(42);
    expect(normalizeProjectId('99')).toBe(99);
    expect(normalizeProjectId(0)).toBeUndefined();
    expect(normalizeProjectId('')).toBeUndefined();
  });

  it('resolveEffectiveProjectId prefers config', () => {
    expect(resolveEffectiveProjectId(7)).toBe(7);
    expect(resolveEffectiveProjectId(undefined)).toBeUndefined();
  });
});
