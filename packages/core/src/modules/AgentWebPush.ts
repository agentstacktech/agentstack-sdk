/**
 * AgentWebPush — browser Web Push (VAPID) subscription API.
 *
 * Server stores subscriptions in `user.data.ecosystem.web_push` (8DNA).
 * @see agentstack-core/endpoints/web_push_endpoints.py
 */

import { HTTPClient } from '../client/http-client';
import type { APIResponse } from '../types';

/** PushSubscription.toJSON() shape from the Push API. */
export interface PushSubscriptionJSON {
  endpoint: string;
  expirationTime?: number | null;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
}

/** Authenticated `GET /api/push/health` — per-user outbox/subscription snapshot + process-local worker counters. */
export interface PushHealthData {
  userId: number;
  canDeliver: boolean;
  publicKeyConfigured: boolean;
  subscriptionCount: number;
  outboxDepth: number;
  workerStatsProcessLocal: Record<string, number>;
}

/** `GET /api/push/vapid-public-key` body (``diagnostics`` / ``operatorHints`` when ``publicKey`` is null). */
export interface VapidPublicKeyDiagnostics {
  ecosystemProjectId: number;
  configNamespace: string;
  publicKeyFromEnv: boolean;
  publicKeyFromEcosystemConfig: boolean;
  privateKeyFromEnv: boolean;
  pywebpushImportable: boolean;
  /** False when public and private env keys are not the same EC pair (push will fail). */
  publicKeyMatchesPrivate?: boolean | null;
}

export interface VapidPublicKeyResponse {
  publicKey: string | null;
  /** Some proxies / serializers may emit snake_case; treat like publicKey. */
  public_key?: string | null;
  configured?: boolean;
  diagnostics?: VapidPublicKeyDiagnostics;
  operatorHints?: string[];
}

export class AgentWebPush {
  constructor(private readonly client: HTTPClient) {}

  /**
   * Decode VAPID public key (base64url) for `PushManager.subscribe({ applicationServerKey })`.
   */
  static urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    let rawData: string;
    if (typeof atob !== 'undefined') {
      rawData = atob(base64);
    } else if (typeof Buffer !== 'undefined') {
      rawData = Buffer.from(base64, 'base64').toString('binary');
    } else {
      throw new Error('AgentWebPush: no base64 decoder (atob/Buffer)');
    }
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Same as {@link urlBase64ToUint8Array} but returns an `ArrayBuffer` slice for strict DOM typings.
   */
  static applicationServerKeyBuffer(base64String: string): ArrayBuffer {
    const key = AgentWebPush.urlBase64ToUint8Array(base64String);
    const out = new ArrayBuffer(key.byteLength);
    new Uint8Array(out).set(key);
    return out;
  }

  async getVapidPublicKey(
    opts?: Parameters<HTTPClient['get']>[2]
  ): Promise<APIResponse<VapidPublicKeyResponse>> {
    // Best-effort cache bust: ``skipCache: true`` on the GET below already skips ProteinCache
    // and in-memory reads, so a stale body cannot be returned. **Do not await** evict:
    // ``evictCacheByUrl`` awaits IndexedDB deletes — on Android that can block 10–60s+ and
    // causes ``vapid_public_key_timeout`` in the UI while the server is healthy.
    void this.client.evictCacheByUrl('/api/push/vapid-public-key').catch(() => {});
    return this.client.get('/api/push/vapid-public-key', undefined, {
      ...opts,
      skipCache: true,
      skipBatching: true,
      skipAuthStateCheck: true,
    });
  }

  /** Authenticated: whether the server can actually send Web Push (VAPID signing + pywebpush). */
  getDeliveryStatus(
    opts?: Parameters<HTTPClient['get']>[2]
  ): Promise<
    APIResponse<{
      publicKeyConfigured: boolean;
      signingConfigured: boolean;
      pywebpushAvailable: boolean;
      canDeliver: boolean;
      messengerOsPushNote?: string;
    }>
  > {
    return this.client.get('/api/push/status', undefined, opts);
  }

  /** Authenticated: subscription/outbox depth + worker stats (see ``PushHealthData``). */
  getPushHealth(opts?: Parameters<HTTPClient['get']>[2]): Promise<APIResponse<PushHealthData>> {
    return this.client.get('/api/push/health', undefined, opts);
  }

  /**
   * Persist subscription in 8DNA. When the server can sign pushes (`canDeliver`), schedules
   * a welcome self-test notification and flushes the outbox in-process.
   */
  registerSubscription(
    body: {
      subscription: PushSubscriptionJSON;
      user_agent?: string;
      /** Optional stable id per browser (multi-device diagnostics / future routing). */
      client_instance_id?: string;
    },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<
    APIResponse<{
      success: boolean;
      welcomePushScheduled?: boolean;
      canDeliver?: boolean;
      deliveryNote?: string | null;
    }>
  > {
    return this.client.post('/api/push/subscribe', body, opts);
  }

  unregisterSubscription(
    endpoint: string,
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<{ success: boolean; removed: boolean }>> {
    return this.client.post('/api/push/unsubscribe', { endpoint }, opts);
  }
}
