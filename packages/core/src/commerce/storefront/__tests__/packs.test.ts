import { listBundledPacks, packSeedOptions, packToSpecs } from '../packs';

describe('commerce/storefront packs', () => {
  it('lists bundled packs', () => {
    const packs = listBundledPacks();
    expect(packs.map((p) => p.id)).toEqual(
      expect.arrayContaining(['starter_three', 'course_academy', 'collectibles', 'creator_digital']),
    );
  });

  it('packToSpecs starter_three remaps demo thumbs', () => {
    const specs = packToSpecs('starter_three', 42);
    expect(specs).toHaveLength(3);
    expect(specs[0].image_url).toBe('/s/42/demo-store/demo/welcome-bundle.svg');
    expect(specs[0].featured).toBe(true);
  });

  it('packSeedOptions exposes set_featured for starter_three', () => {
    expect(packSeedOptions('starter_three')?.set_featured).toBe(true);
  });

  it('packToSpecs returns empty for unknown pack', () => {
    expect(packToSpecs('missing', 1)).toEqual([]);
  });
});
