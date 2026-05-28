/**
 * Typed BroadcastChannel bridge for cross-tab Update Plane sync (`sdk.pwa.update_plane.gen1`).
 */

import type { AppUpdateReason } from './appUpdatePlane';

export const APP_UPDATE_CHANNEL_NAME = 'agentstack:app_update';

export type AppUpdateChannelMsg =
  | {
      type: 'signal';
      reason: AppUpdateReason;
      serverStartedAt?: string;
      buildId: string;
      detectedAt: number;
    }
  | { type: 'dismiss'; snoozeUntil: number; reason: AppUpdateReason }
  | { type: 'applying'; reason: AppUpdateReason };

export type AppUpdateBroadcastBridge = {
  post: (msg: AppUpdateChannelMsg) => void;
  subscribe: (handler: (msg: AppUpdateChannelMsg) => void) => () => void;
  close: () => void;
};

export function createAppUpdateBroadcastBridge(
  channelName = APP_UPDATE_CHANNEL_NAME,
): AppUpdateBroadcastBridge | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  try {
    const channel = new BroadcastChannel(channelName);
    const handlers = new Set<(msg: AppUpdateChannelMsg) => void>();
    channel.onmessage = (ev: MessageEvent<AppUpdateChannelMsg>) => {
      if (!ev.data?.type) return;
      handlers.forEach((h) => h(ev.data));
    };
    return {
      post: (msg) => channel.postMessage(msg),
      subscribe: (handler) => {
        handlers.add(handler);
        return () => handlers.delete(handler);
      },
      close: () => {
        handlers.clear();
        channel.close();
      },
    };
  } catch {
    return null;
  }
}
