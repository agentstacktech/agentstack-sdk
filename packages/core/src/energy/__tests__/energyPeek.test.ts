import { describe, expect, it } from 'vitest';

import { builderEnergyMeetsMinimum } from '../energyPeek';

describe('builderEnergyMeetsMinimum', () => {
  it('treats -1 as unlimited', () => {
    expect(builderEnergyMeetsMinimum({ current: -1 }, 999)).toBe(true);
  });

  it('compares peek current to required', () => {
    expect(builderEnergyMeetsMinimum({ current: 10 }, 50)).toBe(false);
    expect(builderEnergyMeetsMinimum({ current: 50 }, 50)).toBe(true);
  });
});
