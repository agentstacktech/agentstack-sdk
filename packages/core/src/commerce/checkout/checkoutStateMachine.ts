export type CheckoutUiState =
  | 'idle'
  | 'creating'
  | 'awaiting_payment'
  | 'confirming'
  | 'completed'
  | 'failed';

export type CheckoutUiEvent =
  | 'create'
  | 'await_payment'
  | 'confirm'
  | 'complete'
  | 'external_pay_complete'
  | 'fail'
  | 'reset';

export function nextCheckoutUiState(
  current: CheckoutUiState,
  event: CheckoutUiEvent,
): CheckoutUiState {
  if (event === 'reset') return 'idle';
  if (event === 'fail') return 'failed';
  if (event === 'complete' || event === 'external_pay_complete') return 'completed';
  if (event === 'confirm') return 'confirming';
  if (event === 'await_payment') return 'awaiting_payment';
  if (event === 'create') {
    if (current === 'idle' || current === 'failed') return 'creating';
  }
  return current;
}

/** Whether the UI should poll for session completion (fiat awaiting_payment). */
export function shouldPollCheckout(current: CheckoutUiState): boolean {
  return current === 'awaiting_payment' || current === 'confirming';
}
