import {
  buildAssetsWizardHref,
  buildProjectAssetsWizardHref,
  parseAssetsSearchParams,
} from '../index';

describe('commerce/assets url state', () => {
  it('buildAssetsWizardHref includes module and create', () => {
    const href = buildAssetsWizardHref(42, { presetId: 'game_currency', step: 'basics' });
    const sp = new URLSearchParams(href.replace(/^\?/, ''));
    expect(sp.get('module')).toBe('assets');
    expect(sp.get('create')).toBe('1');
    expect(sp.get('preset')).toBe('game_currency');
    expect(sp.get('step')).toBe('basics');
    expect(sp.get('project_id')).toBe('42');
  });

  it('buildProjectAssetsWizardHref uses project path', () => {
    const href = buildProjectAssetsWizardHref(7, 'user', { presetId: 'marketplace_product' });
    expect(href).toContain('/user/projects/7/assets');
    expect(href).toContain('create=1');
    expect(href).not.toContain('module=assets');
  });

  it('parseAssetsSearchParams roundtrip', () => {
    const sp = new URLSearchParams('module=assets&create=1&preset=game_card&step=media&assetId=a1');
    const parsed = parseAssetsSearchParams(sp);
    expect(parsed.create).toBe(true);
    expect(parsed.presetId).toBe('game_card');
    expect(parsed.step).toBe('media');
    expect(parsed.assetId).toBe('a1');
  });
});
