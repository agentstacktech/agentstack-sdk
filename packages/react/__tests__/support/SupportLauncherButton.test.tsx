/**
 * @jest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('../../src/hooks/useSharedOverlayEscape', () => ({
  useSharedOverlayEscape: jest.fn(),
}));

import { SupportLauncherButton } from '../../src/support/SupportLauncherButton';
import { SupportLauncherFrame } from '../../src/support/SupportLauncherFrame';

describe('SupportLauncherButton', () => {
  it('renders a filled 44px control with aria-expanded', () => {
    const onToggle = jest.fn();
    render(
      <SupportLauncherButton
        ariaLabel="Help from AgentStack"
        open={false}
        onToggle={onToggle}
        unread
      />
    );
    const btn = screen.getByRole('button', { name: 'Help from AgentStack' });
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(btn.className).toMatch(/min-h-\[44px\]/);
    expect(btn.querySelector('[data-support-launcher-unread]')).toBeTruthy();
    fireEvent.click(btn);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});

describe('SupportLauncherFrame', () => {
  it('owns title and close chrome when open', () => {
    const onClose = jest.fn();
    render(
      <SupportLauncherFrame open title="AgentStack support" closeLabel="Close" onClose={onClose}>
        <p>thread</p>
      </SupportLauncherFrame>
    );
    expect(screen.getByRole('dialog', { name: 'AgentStack support' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when closed', () => {
    const { container } = render(
      <SupportLauncherFrame open={false} title="AgentStack support" onClose={() => undefined}>
        <p>hidden</p>
      </SupportLauncherFrame>
    );
    expect(container.querySelector('[data-support-launcher-frame]')).toBeNull();
  });
});
