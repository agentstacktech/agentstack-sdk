/**
 * AudioWorklet bundle entry — RNNoise denoise (480-sample frames, 128-sample worklet quantum).
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * Derived from Jitsi Meet (NoiseSuppressorWorklet + RnnoiseProcessor), used under Apache-2.0:
 * - https://github.com/jitsi/jitsi-meet/blob/master/react/features/stream-effects/noise-suppression/NoiseSuppressorWorklet.ts
 * - https://github.com/jitsi/jitsi-meet/blob/master/react/features/stream-effects/rnnoise/RnnoiseProcessor.ts
 *
 * WASM glue: @jitsi/rnnoise-wasm (createRNNWasmModuleSync).
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-expect-error — package ships untyped CJS/ESM glue
import { createRNNWasmModuleSync } from '@jitsi/rnnoise-wasm';

declare const registerProcessor: (name: string, processorCtor: typeof AudioWorkletProcessor) => void;

interface IRnnoiseModule {
  HEAPF32: Float32Array;
  _malloc: (n: number) => number;
  _free: (p: number) => void;
  _rnnoise_create: () => number;
  _rnnoise_destroy: (ctx: number) => void;
  _rnnoise_process_frame: (ctx: number, inPtr: number, outPtr: number) => number;
}

const RNNOISE_SAMPLE_LENGTH = 480;
const RNNOISE_BUFFER_SIZE = RNNOISE_SAMPLE_LENGTH * 4;
const SHIFT_16_BIT_NR = 32768;

function gcd(a: number, b: number): number {
  let x = a;
  let y = b;
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x;
}

function leastCommonMultiple(a: number, b: number): number {
  return (a * b) / gcd(a, b);
}

class RnnoiseProcessor {
  private _context: number;
  private _destroyed = false;
  private _wasmInterface: IRnnoiseModule;
  private _wasmPcmInput: number;
  private _wasmPcmInputF32Index: number;

  constructor(wasmInterface: IRnnoiseModule) {
    try {
      this._wasmInterface = wasmInterface;
      this._wasmPcmInput = this._wasmInterface._malloc(RNNOISE_BUFFER_SIZE);
      this._wasmPcmInputF32Index = this._wasmPcmInput >> 2;
      if (!this._wasmPcmInput) throw new Error('Failed to create wasm input memory buffer!');
      this._context = this._wasmInterface._rnnoise_create();
    } catch (e) {
      this.destroy();
      throw e;
    }
  }

  getSampleLength(): number {
    return RNNOISE_SAMPLE_LENGTH;
  }

  destroy(): void {
    if (this._destroyed) return;
    if (this._wasmPcmInput) this._wasmInterface._free(this._wasmPcmInput);
    if (this._context) this._wasmInterface._rnnoise_destroy(this._context);
    this._destroyed = true;
  }

  processAudioFrame(pcmFrame: Float32Array, shouldDenoise: boolean): number {
    for (let i = 0; i < RNNOISE_SAMPLE_LENGTH; i++) {
      this._wasmInterface.HEAPF32[this._wasmPcmInputF32Index + i] = pcmFrame[i] * SHIFT_16_BIT_NR;
    }
    const vadScore = this._wasmInterface._rnnoise_process_frame(
      this._context,
      this._wasmPcmInput,
      this._wasmPcmInput
    );
    if (shouldDenoise) {
      for (let i = 0; i < RNNOISE_SAMPLE_LENGTH; i++) {
        pcmFrame[i] = this._wasmInterface.HEAPF32[this._wasmPcmInputF32Index + i] / SHIFT_16_BIT_NR;
      }
    }
    return vadScore;
  }
}

class AgentstackRnnoiseProcessor extends AudioWorkletProcessor {
  private _denoiseProcessor: RnnoiseProcessor;
  private _procNodeSampleRate = 128;
  private _denoiseSampleSize: number;
  private _circularBufferLength: number;
  private _circularBuffer: Float32Array;
  private _inputBufferLength = 0;
  private _denoisedBufferLength = 0;
  private _denoisedBufferIndx = 0;
  private _bypass = false;
  /** Running EMA of per-`process()` cost in ms. Reported every ~2s. */
  private _frameMsEma = 0;
  private _frameCount = 0;

  constructor() {
    super();
    const wasm = createRNNWasmModuleSync() as IRnnoiseModule;
    this._denoiseProcessor = new RnnoiseProcessor(wasm);
    this._denoiseSampleSize = this._denoiseProcessor.getSampleLength();
    this._circularBufferLength = leastCommonMultiple(this._procNodeSampleRate, this._denoiseSampleSize);
    this._circularBuffer = new Float32Array(this._circularBufferLength);
    this.port.onmessage = (e: MessageEvent) => {
      if (e.data?.type === 'bypass') this._bypass = !!e.data.on;
    };
    // Announce readiness to the main thread so capture.ts can resolve its init
    // promise without polling — consumed by `createDenoiseWorkletNode`.
    try {
      this.port.postMessage({ type: 'ready' });
    } catch {
      /* unavailable during older runtime init */
    }
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const inData = inputs[0]?.[0];
    const outData = outputs[0]?.[0];
    if (!inData || !outData) return true;
    if (this._bypass) {
      outData.set(inData);
      return true;
    }
    // performance.now() is available in AudioWorkletGlobalScope; use it for the
    // EMA so we can detect CPU contention (e.g. user plugged a Bluetooth codec
    // and the worklet quantum rose above budget).
    const tStart = typeof performance !== 'undefined' ? performance.now() : 0;

    this._circularBuffer.set(inData, this._inputBufferLength);
    this._inputBufferLength += inData.length;

    for (
      ;
      this._denoisedBufferLength + this._denoiseSampleSize <= this._inputBufferLength;
      this._denoisedBufferLength += this._denoiseSampleSize
    ) {
      const denoiseFrame = this._circularBuffer.subarray(
        this._denoisedBufferLength,
        this._denoisedBufferLength + this._denoiseSampleSize
      );
      this._denoiseProcessor.processAudioFrame(denoiseFrame, true);
    }

    let unsentDenoisedDataLength: number;
    if (this._denoisedBufferIndx > this._denoisedBufferLength) {
      unsentDenoisedDataLength = this._circularBufferLength - this._denoisedBufferIndx;
    } else {
      unsentDenoisedDataLength = this._denoisedBufferLength - this._denoisedBufferIndx;
    }

    if (unsentDenoisedDataLength >= outData.length) {
      const denoisedFrame = this._circularBuffer.subarray(
        this._denoisedBufferIndx,
        this._denoisedBufferIndx + outData.length
      );
      outData.set(denoisedFrame, 0);
      this._denoisedBufferIndx += outData.length;
    }

    if (this._denoisedBufferIndx === this._circularBufferLength) {
      this._denoisedBufferIndx = 0;
    }

    if (this._inputBufferLength === this._circularBufferLength) {
      this._inputBufferLength = 0;
      this._denoisedBufferLength = 0;
    }

    if (tStart) {
      const dt = performance.now() - tStart;
      const alpha = 0.1;
      this._frameMsEma = this._frameCount === 0 ? dt : this._frameMsEma * (1 - alpha) + dt * alpha;
      this._frameCount += 1;
      // Batch report every ~2 seconds worth of quanta to avoid main-thread chatter.
      if (this._frameCount % 750 === 0) {
        try {
          this.port.postMessage({
            type: 'frame_ms',
            ema: this._frameMsEma,
            samples: this._frameCount,
          });
        } catch {
          /* disconnected */
        }
      }
    }

    return true;
  }
}

registerProcessor('agentstack-rnnoise', AgentstackRnnoiseProcessor);
