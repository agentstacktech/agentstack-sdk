/**
 * Pluggable denoise engines — RNNoise today; DeepFilterNet opt-in later.
 * Gene: `sdk.media.audio.gen1` (extensibility surface).
 *
 * The SDK registers the **rnnoise** engine by default so consumers can do
 * `sdk.media.audio.getRegisteredDenoiseEngine('rnnoise')` without wiring a
 * factory. A future Pro-tier DFN build replaces the factory at runtime
 * (gene-level composition, not branching inside `createAudioCapture`).
 */

import { createDenoiseWorkletNode, setDenoiseBypass } from './denoise';

export type DenoiseEngineName = 'rnnoise' | 'deepfilternet' | 'none';

export interface DenoiseEngine {
  readonly name: DenoiseEngineName;
  /** Returns an `AudioNode` that processes mono Float32 audio, or `null` to pass-through. */
  init(ctx: globalThis.AudioContext): Promise<AudioNode | null>;
  setBypass?(on: boolean): void;
  dispose(): void;
}

const registry = new Map<string, () => DenoiseEngine>();

export function registerDenoiseEngine(id: string, factory: () => DenoiseEngine): void {
  registry.set(id, factory);
}

export function getRegisteredDenoiseEngine(id: string): (() => DenoiseEngine) | undefined {
  return registry.get(id);
}

/** Stub engine for `none` / tests. */
export function createNoopDenoiseEngine(): DenoiseEngine {
  return {
    name: 'none',
    async init() {
      return null;
    },
    dispose() {
      /* noop */
    },
  };
}

function createRnnoiseEngine(): DenoiseEngine {
  let node: AudioWorkletNode | null = null;
  return {
    name: 'rnnoise',
    async init(ctx) {
      node = await createDenoiseWorkletNode(ctx);
      return node;
    },
    setBypass(on: boolean) {
      setDenoiseBypass(node, on);
    },
    dispose() {
      try {
        node?.disconnect();
      } catch {
        /* ignore */
      }
      node = null;
    },
  };
}

// Register defaults so third parties can discover the baseline engine.
registerDenoiseEngine('rnnoise', createRnnoiseEngine);
registerDenoiseEngine('none', createNoopDenoiseEngine);

export { createRnnoiseEngine };
