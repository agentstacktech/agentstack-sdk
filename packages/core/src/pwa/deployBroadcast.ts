/**
 * Typed BroadcastChannel for deploy cross-tab sync (`sdk.pwa.update_plane.gen1`).
 */

export const DEPLOY_CHANNEL_NAME = 'agentstack:deploy';

export type DeployChannelMsg = { type: 'update-available'; serverStartedAt: string };

export type DeployBroadcastBridge = {
  post: (msg: DeployChannelMsg) => void;
  subscribe: (handler: (msg: DeployChannelMsg) => void) => () => void;
  close: () => void;
};

export function createDeployBroadcastBridge(
  channelName = DEPLOY_CHANNEL_NAME,
): DeployBroadcastBridge | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  try {
    const channel = new BroadcastChannel(channelName);
    const handlers = new Set<(msg: DeployChannelMsg) => void>();
    channel.onmessage = (ev: MessageEvent<DeployChannelMsg>) => {
      if (ev.data?.type !== 'update-available') return;
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
