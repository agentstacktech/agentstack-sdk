/**
 * Filled circular launcher control — chrome only (no chat).
 *
 * Genetic tag: ``frontend.social.support.launcher.gen1`` · ``sdk.support.gen2``
 */

import React from 'react';

export interface SupportLauncherButtonProps {
  ariaLabel: string;
  open: boolean;
  onToggle: () => void;
  unread?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function SupportLauncherButton({
  ariaLabel,
  open,
  onToggle,
  unread = false,
  className,
  children,
}: SupportLauncherButtonProps): React.ReactElement {
  return (
    <button
      type="button"
      data-support-launcher-button=""
      aria-label={ariaLabel}
      aria-expanded={open}
      aria-haspopup="dialog"
      onClick={onToggle}
      className={
        className ??
        [
          'relative inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center',
          'rounded-full border-0 shadow-[var(--shell-shadow-md)]',
          'bg-[var(--shell-accent)] text-[var(--shell-accent-contrast)]',
          'transition-[transform,box-shadow] duration-150 hover:scale-105',
          'focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-[var(--shell-accent)] focus-visible:ring-offset-2',
          'focus-visible:ring-offset-[var(--shell-surface-0)]',
          open && 'shadow-[var(--shell-shadow-lg)]',
        ]
          .filter(Boolean)
          .join(' ')
      }
    >
      {children ?? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 12c0-4.418 4.03-8 9-8s9 3.582 9 8-4.03 8-9 8c-1.02 0-2-.12-2.9-.35L4 20l1.35-3.6C4.5 15.2 4 13.66 4 12Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {unread && !open ? (
        <span
          className="absolute end-0.5 top-0.5 h-2.5 w-2.5 rounded-full bg-rose-500"
          data-support-launcher-unread=""
          aria-hidden
        />
      ) : null}
    </button>
  );
}
