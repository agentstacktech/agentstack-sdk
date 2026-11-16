// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { mountNetDock } from '../src/ui/dock.js';
import { createTable } from '../src/testing/index.js';
import { ticTacToe } from '../examples/tic-tac-toe.js';

describe('mountNetDock', () => {
  it('starts collapsed during playing and expands on FAB click', async () => {
    const t = await createTable(ticTacToe, { players: 2 });
    const session = t.clients[0]!;
    await t.run(50);
    const parent = document.createElement('div');
    document.body.append(parent);
    const dock = mountNetDock(parent, { session, playing: { corner: 'bottom-end' } });
    expect(dock.collapsed).toBe(true);
    expect(dock.el.querySelector('.np-dock-panel')?.hasAttribute('hidden')).toBe(true);
    dock.expand();
    expect(dock.collapsed).toBe(false);
    expect(dock.el.querySelector('.np-dock-panel')?.hasAttribute('hidden')).toBe(false);
    dock.destroy();
    parent.remove();
  });
});