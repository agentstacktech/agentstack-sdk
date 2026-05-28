/**
 * SDK media audio facade — `sdk.media.audio` on `AgentStackMediaSurface`.
 * Gene: `sdk.media.audio.gen1`
 */

import { createAudioCapture, type AudioCaptureHandle, type AudioCaptureOptions } from './capture';
import {
  createDenoiseWorkletNode,
  isAudioDenoiseSupported,
  resolveRnnoiseWorkletScriptUrl,
  setDenoiseBypass,
} from './denoise';
import { registerDenoiseEngine, getRegisteredDenoiseEngine, createNoopDenoiseEngine } from './engines';
import type { DenoiseEngine } from './engines';

export interface AgentStackMediaAudioSurface {
  readonly isDenoiseSupported: typeof isAudioDenoiseSupported;
  readonly resolveRnnoiseWorkletScriptUrl: typeof resolveRnnoiseWorkletScriptUrl;
  createCapture: typeof createAudioCapture;
  createDenoiseWorkletNode: typeof createDenoiseWorkletNode;
  setDenoiseBypass: typeof setDenoiseBypass;
  registerDenoiseEngine: typeof registerDenoiseEngine;
  getRegisteredDenoiseEngine: typeof getRegisteredDenoiseEngine;
  createNoopDenoiseEngine: typeof createNoopDenoiseEngine;
}

export function createAgentStackMediaAudio(): AgentStackMediaAudioSurface {
  return {
    isDenoiseSupported: isAudioDenoiseSupported,
    resolveRnnoiseWorkletScriptUrl,
    createCapture: createAudioCapture,
    createDenoiseWorkletNode,
    setDenoiseBypass,
    registerDenoiseEngine,
    getRegisteredDenoiseEngine,
    createNoopDenoiseEngine,
  };
}

export type { AudioCaptureHandle, AudioCaptureOptions, AudioEnhanceProfileId } from './capture';
export type { DenoiseEngine, DenoiseEngineName } from './engines';
