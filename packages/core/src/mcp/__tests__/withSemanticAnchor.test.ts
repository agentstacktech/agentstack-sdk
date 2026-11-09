import { withSemanticAnchor, type McpExecuteOptions } from '../execute';

describe('withSemanticAnchor', () => {
  it('fills goal when missing', () => {
    const base: Pick<McpExecuteOptions, 'goal'> = {};
    expect(withSemanticAnchor(base, 'Ship feature')).toEqual({ goal: 'Ship feature' });
  });

  it('does not override existing goal', () => {
    const base = { goal: 'Keep' };
    expect(withSemanticAnchor(base, 'Replace')).toEqual({ goal: 'Keep' });
  });
});
