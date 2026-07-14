import {
  disposeSharedOverlayEscapeBridge,
  getSharedOverlayEscapeBridge,
  registerSharedOverlayEscapeConsumer,
} from '../../src/browser/sharedOverlayEscapeBridge';
import { deferEscapeWhen } from '../../src/browser/escapeDeferPolicy';

const mkEsc = (): KeyboardEvent =>
  ({ key: 'Escape', preventDefault: jest.fn(), stopImmediatePropagation: jest.fn() } as unknown as KeyboardEvent);

describe('sharedOverlayEscapeBridge', () => {
  afterEach(() => {
    disposeSharedOverlayEscapeBridge();
  });

  it('returns the same bridge instance', () => {
    const a = getSharedOverlayEscapeBridge();
    const b = getSharedOverlayEscapeBridge();
    expect(a).toBe(b);
  });

  it('dispose clears singleton so next get creates a new bridge', () => {
    const a = getSharedOverlayEscapeBridge();
    disposeSharedOverlayEscapeBridge();
    const b = getSharedOverlayEscapeBridge();
    expect(b).not.toBe(a);
  });
});

describe('registerSharedOverlayEscapeConsumer + deferEscapeWhen', () => {
  afterEach(() => {
    disposeSharedOverlayEscapeBridge();
  });

  it('deferEscapeWhen skips inner when shouldDefer is true', () => {
    const inner = jest.fn(() => true);
    const wrapped = deferEscapeWhen(() => true, inner);
    expect(wrapped(mkEsc())).toBe(false);
    expect(inner).not.toHaveBeenCalled();
  });

  it('deferEscapeWhen runs inner when shouldDefer is false', () => {
    const inner = jest.fn(() => true);
    const wrapped = deferEscapeWhen(() => false, inner);
    expect(wrapped(mkEsc())).toBe(true);
    expect(inner).toHaveBeenCalledTimes(1);
  });
});

describe('registerSharedOverlayEscapeConsumer (window mock)', () => {
  type WinListener = { type: string; fn: (e: unknown) => void; capture: boolean };
  let winListeners: WinListener[];

  beforeEach(() => {
    disposeSharedOverlayEscapeBridge();
    winListeners = [];
    (global as unknown as { window: unknown }).window = {
      addEventListener(type: string, fn: (e: unknown) => void, capture?: boolean) {
        if (type === 'keydown') winListeners.push({ type, fn, capture: !!capture });
      },
      removeEventListener(type: string, fn: (e: unknown) => void, capture?: boolean) {
        const i = winListeners.findIndex(
          (l) => l.type === type && l.fn === fn && l.capture === !!capture
        );
        if (i >= 0) winListeners.splice(i, 1);
      },
      dispatchEvent(ev: { key: string }) {
        const cap = winListeners.filter((l) => l.capture);
        for (const l of [...cap]) l.fn(ev);
      },
    };
  });

  afterEach(() => {
    disposeSharedOverlayEscapeBridge();
    delete (global as unknown as { window?: unknown }).window;
  });

  it('LIFO: newest runs first', () => {
    const order: string[] = [];
    registerSharedOverlayEscapeConsumer(() => {
      order.push('older');
      return false;
    });
    registerSharedOverlayEscapeConsumer(() => {
      order.push('newer');
      return true;
    });
    (global as unknown as { window: { dispatchEvent: (e: unknown) => void } }).window.dispatchEvent({
      key: 'Escape',
      preventDefault: jest.fn(),
      stopImmediatePropagation: jest.fn(),
    });
    expect(order[0]).toBe('newer');
  });

  it('LIFO: when newest returns false, older is tried', () => {
    const order: string[] = [];
    registerSharedOverlayEscapeConsumer(() => {
      order.push('older');
      return true;
    });
    registerSharedOverlayEscapeConsumer(() => {
      order.push('newer');
      return false;
    });
    (global as unknown as { window: { dispatchEvent: (e: unknown) => void } }).window.dispatchEvent({
      key: 'Escape',
      preventDefault: jest.fn(),
      stopImmediatePropagation: jest.fn(),
    });
    expect(order).toEqual(['newer', 'older']);
  });
});
