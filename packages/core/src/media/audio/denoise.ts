/**
 * RNNoise AudioWorklet wiring — lazy `addModule`, `agentstack-rnnoise` processor.
 * Gene: `sdk.media.audio.denoise.gen1`.
 *
 * Protocol (main ↔ worklet):
 *   worklet → main: `{ type: 'ready' }` (one-shot after WASM init)
 *                 : `{ type: 'frame_ms', ema, samples }` (every ~2s)
 *   main → worklet: `{ type: 'bypass', on }`
 */

import { workletBundleBaseUrl } from './worklet-url';

const PROCESSOR_NAME = 'agentstack-rnnoise';

export function isAudioDenoiseSupported(): boolean {
  if (typeof globalThis === 'undefined') return false;
  const g = globalThis as Record<string, unknown>;
  const secure =
    typeof g.isSecureContext === 'undefined' ? true : (g.isSecureContext as boolean) === true;
  return Boolean(
    secure &&
      typeof g.AudioWorkletNode !== 'undefined' &&
      typeof g.WebAssembly !== 'undefined' &&
      typeof g.AudioContext !== 'undefined'
  );
}

/**
 * Resolves the bundled worklet URL relative to the **built** SDK entry (`dist/index.esm.js`).
 * Rollup copies `noise-suppressor-worklet.bundle.js` → `dist/media/audio/`.
 */
export function resolveRnnoiseWorkletScriptUrl(): string {
  return new URL('media/audio/noise-suppressor-worklet.bundle.js', workletBundleBaseUrl()).href;
}

export interface CreateDenoiseWorkletNodeOptions {
  /** Called once after successful `addModule` + node construction. */
  onInitMs?: (ms: number) => void;
  /** Periodic EMA of per-quantum cost (ms) — from worklet `frame_ms` messages. */
  onFrameMs?: (ms: number, samples: number) => void;
}

/**
 * Creates an `AudioWorkletNode` running RNNoise, or `null` on failure / unsupported context.
 */
export async function createDenoiseWorkletNode(
  ctx: AudioContext,
  opts?: CreateDenoiseWorkletNodeOptions
): Promise<AudioWorkletNode | null> {
  if (!isAudioDenoiseSupported()) return null;
  const t0 = performance.now();
  const url = resolveRnnoiseWorkletScriptUrl();
  try {
    // `{ type: 'module' }` — ESM worklet bundle; DOM typings lag on some TS versions.
    await (ctx.audioWorklet as AudioWorklet & { addModule: (u: string, o?: object) => Promise<void> }).addModule(
      url,
      { type: 'module' }
    );
  } catch {
    return null;
  }
  try {
    const node = new AudioWorkletNode(ctx, PROCESSOR_NAME, {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
    });
    if (opts?.onFrameMs) {
      const onFrameMs = opts.onFrameMs;
      node.port.addEventListener('message', (e: MessageEvent) => {
        const data = e.data as { type?: string; ema?: number; samples?: number } | undefined;
        if (data?.type === 'frame_ms' && typeof data.ema === 'number') {
          onFrameMs(data.ema, typeof data.samples === 'number' ? data.samples : 0);
        }
      });
      // `addEventListener` requires explicit `start()` on MessagePort.
      node.port.start();
    }
    opts?.onInitMs?.(performance.now() - t0);
    return node;
  } catch {
    return null;
  }
}

export function setDenoiseBypass(node: AudioWorkletNode | null, on: boolean): void {
  try {
    node?.port.postMessage({ type: 'bypass', on });
  } catch {
    /* ignore */
  }
}
