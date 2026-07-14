import {
  nextCheckoutUiState,
  shouldPollCheckout,
  type CheckoutUiEvent,
  type CheckoutUiState,
} from '../checkoutStateMachine';

describe('checkoutStateMachine', () => {
  it('idle -> creating on create', () => {
    expect(nextCheckoutUiState('idle', 'create')).toBe('creating');
  });

  it('failed -> creating on create retry', () => {
    expect(nextCheckoutUiState('failed', 'create')).toBe('creating');
  });

  it('transitions through payment rails', () => {
    let state: CheckoutUiState = 'creating';
    state = nextCheckoutUiState(state, 'await_payment');
    expect(state).toBe('awaiting_payment');
    state = nextCheckoutUiState(state, 'confirm');
    expect(state).toBe('confirming');
    state = nextCheckoutUiState(state, 'complete');
    expect(state).toBe('completed');
  });

  it('external_pay_complete from awaiting_payment', () => {
    expect(nextCheckoutUiState('awaiting_payment', 'external_pay_complete')).toBe(
      'completed',
    );
  });

  it('fail and reset', () => {
    expect(nextCheckoutUiState('confirming', 'fail')).toBe('failed');
    expect(nextCheckoutUiState('failed', 'reset')).toBe('idle');
  });

  it('shouldPollCheckout only during async rails', () => {
    expect(shouldPollCheckout('awaiting_payment')).toBe(true);
    expect(shouldPollCheckout('confirming')).toBe(true);
    expect(shouldPollCheckout('completed')).toBe(false);
    expect(shouldPollCheckout('idle')).toBe(false);
  });

  it('ignores invalid create when not idle/failed', () => {
    const events: CheckoutUiEvent[] = ['create'];
    expect(nextCheckoutUiState('completed', events[0])).toBe('completed');
  });
});
