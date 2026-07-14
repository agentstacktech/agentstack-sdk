/**
 * Coalesced build-id + SW update probes (`sdk.pwa.update_plane.gen2`).
 */

import { probeStaticBuildMismatch, type ProbeStaticBuildResult } from './appUpdatePlane';

export type RunAppUpdateProbesInput = {
  checkSwUpdate?: () => Promise<void>;
  probeBuild: () => ReturnType<typeof probeStaticBuildMismatch>;
  onBuildMismatch: (remoteBuildId: string | null, result: ProbeStaticBuildResult) => void;
  onBuildProbeResult?: (result: ProbeStaticBuildResult) => void;
  onProbeTimingMs?: (ms: number) => void;
  inflight?: { current: Promise<void> | null };
};

export async function runAppUpdateProbes(input: RunAppUpdateProbesInput): Promise<void> {
  const guard = input.inflight ?? { current: null as Promise<void> | null };
  if (guard.current) return guard.current;

  guard.current = (async () => {
    if (input.checkSwUpdate) {
      await input.checkSwUpdate();
    }
    const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
    const result = await input.probeBuild();
    input.onBuildProbeResult?.(result);
    if (typeof performance !== 'undefined' && input.onProbeTimingMs) {
      input.onProbeTimingMs(Math.round(performance.now() - t0));
    }
    if (result.mismatch && result.remoteBuildId) {
      input.onBuildMismatch(result.remoteBuildId, result);
    }
  })().finally(() => {
    guard.current = null;
  });

  return guard.current;
}

export function createBuildProbe(
  input: Parameters<typeof probeStaticBuildMismatch>[0],
): () => ReturnType<typeof probeStaticBuildMismatch> {
  return () => probeStaticBuildMismatch(input);
}
