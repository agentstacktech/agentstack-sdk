/**
 * `createAudioCapture` — getUserMedia → optional RNNoise worklet → enhance → MediaStreamDestination.
 * Gene: `sdk.media.audio.capture.gen1`
 */

import { buildEnhanceChain } from './enhance';
import { createDenoiseWorkletNode, isAudioDenoiseSupported, setDenoiseBypass } from './denoise';
import type { AudioEnhanceProfileId } from './profiles';

export type { AudioEnhanceProfileId } from './profiles';

export interface AudioCaptureOptions {
  profile: AudioEnhanceProfileId;
  deviceId?: string;
  monitor?: { rafMeter?: boolean };
  signal?: AbortSignal;
  /** Telemetry hooks (optional) — messenger maps to beacons. */
  telemetry?: {
    onDenoiseInitMs?: (ms: number) => void;
    onDenoiseFallback?: (reason: string) => void;
    /** Periodic EMA of per-quantum worklet cost (ms). */
    onDenoiseFrameMs?: (ms: number, samples: number) => void;
  };
}

export interface AudioCaptureHandle {
  /** Clean track for `MediaRecorder` */
  stream: MediaStream;
  /** Raw mic stream (same object when denoise skipped) */
  sourceStream: MediaStream;
  meter: AnalyserNode | null;
  bypass(on: boolean): void;
  dispose(): void;
  profile: AudioEnhanceProfileId;
  /** Internal: for tests / advanced wiring */
  readonly _audioContext: AudioContext;
  readonly _denoiseNode: AudioWorkletNode | null;
}

export async function createAudioCapture(opts: AudioCaptureOptions): Promise<AudioCaptureHandle> {
  const profile = opts.profile;
  const constraints: MediaStreamConstraints = {
    audio: {
      ...(opts.deviceId ? { deviceId: { exact: opts.deviceId } } : {}),
      echoCancellation: true,
      autoGainControl: false,
      noiseSuppression: true,
      channelCount: 1,
      sampleRate: 48000,
    },
    video: false,
  };

  const sourceStream = await navigator.mediaDevices.getUserMedia(constraints);
  opts.signal?.throwIfAborted();

  const ctx = new AudioContext({ sampleRate: 48000 });
  const src = ctx.createMediaStreamSource(sourceStream);

  let denoiseNode: AudioWorkletNode | null = null;
  if (isAudioDenoiseSupported()) {
    denoiseNode = await createDenoiseWorkletNode(ctx, {
      onInitMs: opts.telemetry?.onDenoiseInitMs,
      onFrameMs: opts.telemetry?.onDenoiseFrameMs,
    });
    if (!denoiseNode) {
      opts.telemetry?.onDenoiseFallback?.('worklet_init_failed');
    }
  } else {
    opts.telemetry?.onDenoiseFallback?.('not_supported');
  }

  const chain = buildEnhanceChain(ctx, profile);
  const dest = ctx.createMediaStreamDestination();
  const meter = opts.monitor?.rafMeter ? ctx.createAnalyser() : null;
  if (meter) {
    meter.fftSize = 1024;
    meter.smoothingTimeConstant = 0.65;
  }

  if (denoiseNode) {
    src.connect(denoiseNode);
    denoiseNode.connect(chain.input);
  } else {
    src.connect(chain.input);
  }
  chain.output.connect(dest);
  if (meter) {
    chain.output.connect(meter);
  }

  let closed = false;
  const dispose = (): void => {
    if (closed) return;
    closed = true;
    try {
      sourceStream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {
          /* ignore */
        }
      });
    } catch {
      /* ignore */
    }
    ctx.close().catch(() => undefined);
  };

  return {
    stream: dest.stream,
    sourceStream,
    meter,
    bypass(on: boolean) {
      setDenoiseBypass(denoiseNode, on);
    },
    dispose,
    profile,
    _audioContext: ctx,
    _denoiseNode: denoiseNode,
  };
}
