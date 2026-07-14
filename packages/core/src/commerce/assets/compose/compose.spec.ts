import { composeAssetFromPreset } from './composeAssetFromPreset';

describe('composeAssetFromPreset', () => {
  it('composes game_currency from bundled preset', () => {
    const draft = composeAssetFromPreset(1, 'game_currency', {
      name: 'GOLD',
      priceUsdt: '1.00',
    });
    expect(draft.name).toBe('GOLD');
    expect(draft.type).toBe('currency');
    expect(draft.components.properties?.stackable).toBe(true);
    expect(draft.components.metadata?.created_by_preset).toBe('game_currency');
  });
});
