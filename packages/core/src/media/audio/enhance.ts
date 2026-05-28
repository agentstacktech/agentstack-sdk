/**
 * Post-RNNoise gentle shaping — HPF + dynamics compressor + soft limiter.
 * Gene: `sdk.media.audio.enhance.gen1`
 *
 * Rationale (WebRTC-style): RNNoise leaves low-frequency rumble; HPF removes it.
 * Single-stage compressor evens level without browser AGC “breathing”. Limiter prevents
 * inter-sample clips before `MediaStreamDestination`.
 */

import type { AudioEnhanceProfileId } from './profiles';

export interface EnhanceChain {
  /** Connect `MediaStreamSource` here (or denoise output). */
  input: AudioNode;
  /** Connect to `MediaStreamDestination` / further nodes. */
  output: AudioNode;
}

function makeSoftLimiterCurve(): Float32Array {
  const n = 4096;
  const curve = new Float32Array(n);
  const threshold = 0.94;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    const s = Math.sign(x);
    const ax = Math.abs(x);
    curve[i] = ax <= threshold ? x : s * (threshold + (1 - threshold) * Math.tanh((ax - threshold) * 6));
  }
  return curve;
}

export function buildEnhanceChain(ctx: BaseAudioContext, profile: AudioEnhanceProfileId): EnhanceChain {
  const hpf = ctx.createBiquadFilter();
  hpf.type = 'highpass';
  hpf.Q.value = 0.707;
  hpf.frequency.value = profile === 'messenger_video_note' ? 60 : profile === 'raw' ? 40 : 80;

  const comp = ctx.createDynamicsCompressor();
  if (profile === 'messenger_video_note') {
    comp.threshold.value = -22;
    comp.knee.value = 18;
    comp.ratio.value = 2.5;
    comp.attack.value = 0.004;
    comp.release.value = 0.22;
  } else if (profile === 'raw') {
    comp.threshold.value = -3;
    comp.knee.value = 0;
    comp.ratio.value = 1.1;
    comp.attack.value = 0.003;
    comp.release.value = 0.25;
  } else {
    comp.threshold.value = -22;
    comp.knee.value = 20;
    comp.ratio.value = 3;
    comp.attack.value = 0.003;
    comp.release.value = 0.25;
  }

  const limiter = ctx.createWaveShaper();
  limiter.curve = makeSoftLimiterCurve() as unknown as Float32Array<ArrayBuffer>;
  limiter.oversample = '4x';

  hpf.connect(comp);
  comp.connect(limiter);
  return { input: hpf, output: limiter };
}
