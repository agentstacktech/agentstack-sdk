import { describe, expect, it } from 'vitest';
import { themeCss } from '../src/ui/index.js';

describe('theme', () => {
  it('dark by default, light on request, auto follows prefers-color-scheme; every colour is a variable', () => {
    const dark = themeCss(), light = themeCss('light'), auto = themeCss('auto');
    expect(dark).toContain('color-scheme:dark');
    expect(light).toContain('color-scheme:light');
    expect(auto).toMatch(/@media \(prefers-color-scheme:light\)/);
    for (const v of ['--np-page', '--np-surface', '--np-fg', '--np-accent', '--np-font', '--np-bg']) expect(dark).toContain(v + ':');
    expect(dark).toMatch(/\.np-key\{min-height:64px/); // big tap keys
    expect(dark).toContain('.np-app{min-height:100dvh');
  });
});
