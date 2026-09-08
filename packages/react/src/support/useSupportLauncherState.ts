/**
 * Local open state for support launcher chrome (sessionStorage, one tab).
 * No SDK context — safe for DualShell / public layout.
 *
 * Genetic tag: ``frontend.social.support.launcher.gen1`` · ``sdk.support.gen2``
 */

import { useCallback, useState } from 'react';

export const SUPPORT_LAUNCHER_OPEN_PREFIX = 'agentstack.support.launcher.open.';

export function useSupportLauncherState(opts: {
  projectId: number;
  enabled?: boolean;
}): { open: boolean; setOpen: (next: boolean) => void; toggle: () => void } {
  const storageKey = `${SUPPORT_LAUNCHER_OPEN_PREFIX}${opts.projectId}`;
  const [open, setOpenState] = useState(() => {
    if (typeof sessionStorage === 'undefined') return false;
    try {
      return sessionStorage.getItem(storageKey) === '1';
    } catch {
      return false;
    }
  });

  const setOpen = useCallback(
    (next: boolean) => {
      setOpenState(next);
      try {
        sessionStorage.setItem(storageKey, next ? '1' : '0');
      } catch {
        /* private mode */
      }
    },
    [storageKey]
  );

  const toggle = useCallback(() => setOpen(!open), [open, setOpen]);
  return { open: opts.enabled === false ? false : open, setOpen, toggle };
}
