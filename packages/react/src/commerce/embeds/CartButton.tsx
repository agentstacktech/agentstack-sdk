import React from 'react';

import type { CartButtonProps } from './types';

export function CartButton({
  label = 'Cart',
  className,
  actions,
  cartPath = '/user/shop/cart',
}: CartButtonProps): React.ReactElement {
  const onClick = () => {
    if (actions?.openCartDrawer) {
      actions.openCartDrawer();
      return;
    }
    if (typeof window !== 'undefined') {
      window.location.assign(cartPath);
    }
  };

  return (
    <button
      type="button"
      className={className ?? 'min-h-[44px] rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium'}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
