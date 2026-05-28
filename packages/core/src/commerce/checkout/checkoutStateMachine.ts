export type CheckoutUiState =
  | 'idle'
  | 'creating'
  | 'awaiting_payment'
  | 'confirming'
  | 'completed'
  | 'failed';

export function nextCheckoutUiState(
  current: CheckoutUiState,
  event: 'create' | 'await_payment' | 'confirm' | 'complete' | 'fail' | 'reset',
): CheckoutUiState {
  if (event === 'reset') return 'idle';
  if (event === 'fail') return 'failed';
  if (event === 'complete') return 'completed';
  if (event === 'confirm') return 'confirming';
  if (event === 'await_payment') return 'awaiting_payment';
  if (event === 'create') {
    if (current === 'idle' || current === 'failed') return 'creating';
  }
  return current;
}
