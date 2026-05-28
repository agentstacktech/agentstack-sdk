/**
 * WebCodecs video encode — capability probe (spike / future ``sdk.media.video``).
 *
 * Gene: ``repo.engineering.client_side_computation.gen1`` — client-side encode before upload.
 * No runtime dependency on ``VideoEncoder`` until a caller imports this module.
 */

export type WebCodecsVideoEncodeCapability = {
  /** True when ``VideoEncoder`` + ``VideoFrame`` exist in this global. */
  supported: boolean;
  /** True when ``VideoEncoder.isConfigSupported`` is available for codec probes. */
  vp8Configurable: boolean;
};

type VideoEncoderCtor = {
  new (init: unknown): unknown;
  isConfigSupported?: (config: unknown) => Promise<{ supported: boolean }>;
};

/**
 * Feature-detect WebCodecs video encode. Safe in Node (returns ``supported: false``).
 */
export function getWebCodecsVideoEncodeCapability(): WebCodecsVideoEncodeCapability {
  if (typeof globalThis === 'undefined') {
    return { supported: false, vp8Configurable: false };
  }
  const g = globalThis as unknown as { VideoEncoder?: VideoEncoderCtor; VideoFrame?: unknown };
  const VE = g.VideoEncoder;
  const VF = g.VideoFrame;
  if (typeof VE !== 'function' || typeof VF !== 'function') {
    return { supported: false, vp8Configurable: false };
  }
  return { supported: true, vp8Configurable: typeof VE.isConfigSupported === 'function' };
}

/**
 * Async: asks the UA whether VP8 WebCodecs encode is allowed (when ``isConfigSupported`` exists).
 * Returns ``null`` when the API is missing or the probe cannot run.
 */
export async function probeVp8EncoderConfigurable(): Promise<boolean | null> {
  const cap = getWebCodecsVideoEncodeCapability();
  if (!cap.supported || !cap.vp8Configurable) return null;
  const g = globalThis as unknown as { VideoEncoder: VideoEncoderCtor };
  try {
    const r = await g.VideoEncoder.isConfigSupported!({
      codec: 'vp8',
      width: 480,
      height: 480,
      bitrate: 1_000_000,
      framerate: 30,
    });
    return Boolean(r?.supported);
  } catch {
    return null;
  }
}
