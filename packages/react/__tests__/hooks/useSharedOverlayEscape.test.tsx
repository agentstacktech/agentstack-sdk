/**
 * @jest-environment jsdom
 */

jest.mock('@agentstack/sdk', () => {
  const bridge = jest.requireActual<
    typeof import('../../../core/src/browser/sharedOverlayEscapeBridge')
  >('../../../core/src/browser/sharedOverlayEscapeBridge');
  return {
    registerSharedOverlayEscapeConsumer: bridge.registerSharedOverlayEscapeConsumer,
  };
});

import React from 'react';
import { render } from '@testing-library/react';
import { disposeSharedOverlayEscapeBridge } from '../../../core/src/browser/sharedOverlayEscapeBridge';
import { useSharedOverlayEscape } from '../../src/hooks/useSharedOverlayEscape';

afterEach(() => {
  disposeSharedOverlayEscapeBridge();
});

function Probe({
  enabled,
  onHit,
}: {
  enabled: boolean;
  onHit: () => void;
}) {
  useSharedOverlayEscape(enabled, () => {
    onHit();
    return true;
  });
  return null;
}

describe('useSharedOverlayEscape', () => {
  it('invokes handler when enabled and Escape is dispatched', () => {
    const onHit = jest.fn();
    render(<Probe enabled onHit={onHit} />);
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    );
    expect(onHit).toHaveBeenCalledTimes(1);
  });

  it('does not register when disabled', () => {
    const onHit = jest.fn();
    render(<Probe enabled={false} onHit={onHit} />);
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    );
    expect(onHit).not.toHaveBeenCalled();
  });
});
