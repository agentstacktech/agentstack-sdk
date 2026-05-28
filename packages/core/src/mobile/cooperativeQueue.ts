/**
 * Cooperative main-thread work queue (`sdk.mobile.gen1`).
 */

export type WorkPriority = 'critical' | 'visible' | 'idle' | 'background';

export type ScheduledWork = {
  id: string;
  priority: WorkPriority;
  /** Diagnostic label for RUM / boot panel. */
  label?: string;
  run: () => void | Promise<void>;
};

type QueueEntry = ScheduledWork & { cancelled: boolean };

const PRIORITY_RANK: Record<WorkPriority, number> = {
  critical: 0,
  visible: 1,
  idle: 2,
  background: 3,
};

let queue: QueueEntry[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushing = false;
const VISIBLE_DEBOUNCE_MS = 400;

function scheduleFlush(delayMs: number): void {
  if (typeof window === 'undefined') return;
  if (flushTimer != null) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushCooperativeWork('visible');
  }, delayMs);
}

function runWhenIdle(fn: () => void): void {
  if (typeof window === 'undefined') {
    fn();
    return;
  }
  const sched = (window as Window & { scheduler?: { postTask?: (cb: () => void, opts?: { priority?: string }) => void } })
    .scheduler;
  if (sched?.postTask) {
    sched.postTask(fn, { priority: 'background' });
    return;
  }
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(() => fn(), { timeout: 2000 });
    return;
  }
  setTimeout(fn, 0);
}

export function getCooperativeQueueDepth(): number {
  return queue.filter((e) => !e.cancelled).length;
}

export type ScheduleIdleWorkOptions = {
  priority?: WorkPriority;
  label: string;
};

/** Ergonomic scheduler entry (`sdk.mobile.gen1`). */
export function scheduleIdleWork(
  fn: () => void | Promise<void>,
  opts: ScheduleIdleWorkOptions,
): () => void {
  return scheduleCooperativeWork({
    id: opts.label,
    label: opts.label,
    priority: opts.priority ?? 'idle',
    run: fn,
  });
}

export function scheduleCooperativeWork(work: ScheduledWork): () => void {
  const existing = queue.findIndex((e) => e.id === work.id);
  const entry: QueueEntry = { ...work, cancelled: false };
  if (existing >= 0) queue[existing] = entry;
  else queue.push(entry);

  if (work.priority === 'critical') {
    void flushCooperativeWork('manual');
  } else if (work.priority === 'visible') {
    scheduleFlush(VISIBLE_DEBOUNCE_MS);
  } else {
    runWhenIdle(() => void flushCooperativeWork('idle'));
  }

  return () => {
    const i = queue.findIndex((e) => e.id === work.id);
    if (i >= 0) queue[i]!.cancelled = true;
  };
}

export async function flushCooperativeWork(_reason: 'visible' | 'idle' | 'manual'): Promise<void> {
  if (flushing || typeof window === 'undefined') return;
  flushing = true;
  try {
    const batch = queue
      .filter((e) => !e.cancelled)
      .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
    queue = queue.filter((e) => e.cancelled);

    for (const entry of batch) {
      try {
        await entry.run();
      } catch {
        /* isolated */
      }
      const sched = (window as Window & { scheduler?: { yield?: () => Promise<void> } }).scheduler;
      if (sched?.yield) await sched.yield();
    }
  } finally {
    flushing = false;
  }
}

export function clearCooperativeQueue(): void {
  queue = [];
  if (flushTimer != null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
}
