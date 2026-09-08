/**
 * Dialog / bottom-sheet chrome for the support launcher. Slot children — no MessageList.
 *
 * Genetic tag: ``frontend.social.support.launcher.gen1`` · ``sdk.support.gen2``
 */

import React, { useEffect, useId, useRef } from 'react';
import { useSharedOverlayEscape } from '../hooks/useSharedOverlayEscape';

export interface SupportLauncherFrameProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Visible close control label (caller i18n). */
  closeLabel?: string;
  className?: string;
}

export function SupportLauncherFrame({
  open,
  onClose,
  title,
  children,
  closeLabel = 'Close',
  className,
}: SupportLauncherFrameProps): React.ReactElement | null {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();

  useSharedOverlayEscape(open, (event) => {
    event.preventDefault();
    onClose();
    return true;
  });

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => {
      prev?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      data-support-launcher-frame=""
      className={
        className ??
        [
          'flex flex-col overflow-hidden rounded-t-xl border border-[var(--shell-border)]',
          'bg-[var(--shell-surface-0)] text-[var(--shell-text)] shadow-[var(--shell-shadow-lg)] outline-none',
          'h-[min(85dvh,560px)] w-full max-w-none sm:h-[min(70vh,560px)] sm:w-[380px] sm:max-w-[380px] sm:rounded-xl',
        ].join(' ')
      }
    >
      <div
        data-support-launcher-header=""
        className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--shell-border)] px-3 py-2"
      >
        <h2 id={titleId} className="text-sm font-semibold text-[var(--shell-text-strong)]">
          {title}
        </h2>
        <button
          type="button"
          data-support-launcher-close=""
          className="shell-tap-target inline-flex min-h-11 items-center rounded-md px-2 text-sm text-[var(--shell-text-muted)] hover:bg-[var(--shell-nav-bg-hover)]"
          onClick={onClose}
        >
          {closeLabel}
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col text-[var(--shell-text)]">{children}</div>
    </div>
  );
}
