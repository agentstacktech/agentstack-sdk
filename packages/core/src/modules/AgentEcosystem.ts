/**
 * AgentEcosystem — project ecosystem channel manifest and grants (REST).
 */

import { HTTPClient } from '../client/http-client';
import { executeOrNotFoundFallback } from '../utils/httpDeleteIdempotent';

export type EcosystemChannelAccess = 'OPEN' | 'GRANTED' | 'SYSTEM_ONLY';
export type EcosystemChannelType = 'EVENT' | 'FIELD_CHANGE';

export interface EcosystemPublishedChannel {
  access: EcosystemChannelAccess;
  type: EcosystemChannelType;
  public_fields: string[];
  description: string;
  allow_chain: boolean;
  quota_per_minute: number;
}

export interface EcosystemManifest {
  project_id: number;
  published_channels: Record<string, EcosystemPublishedChannel>;
  channel_grants: Record<string, Record<string, unknown> | number[]>;
  channels?: Record<string, EcosystemPublishedChannel>;
}

export interface EcosystemConnectionsPayload {
  project_id: number;
  connections: Record<string, unknown>;
}

export class AgentEcosystem {
  constructor(private client: HTTPClient) {}

  /**
   * GET /projects/{pid}/ecosystem/manifest
   */
  async getManifest(projectId: number): Promise<EcosystemManifest> {
    const response = await this.client.get(`/projects/${projectId}/ecosystem/manifest`);
    return response.data as EcosystemManifest;
  }

  /**
   * PUT /projects/{pid}/ecosystem/channels
   */
  async updateChannels(
    projectId: number,
    channels: Record<string, EcosystemPublishedChannel>,
    options?: { replace?: boolean }
  ): Promise<Record<string, unknown>> {
    const body: Record<string, unknown> = { channels };
    if (options?.replace !== undefined) {
      body.replace = options.replace;
    }
    const response = await this.client.put(`/projects/${projectId}/ecosystem/channels`, body);
    return (response.data ?? {}) as Record<string, unknown>;
  }

  /**
   * POST /projects/{pid}/ecosystem/channels/{eventType}/grant/{subscriberPid}
   */
  async grantSubscribe(
    projectId: number,
    eventType: string,
    subscriberProjectId: number
  ): Promise<Record<string, unknown>> {
    const enc = encodeURIComponent(eventType);
    const response = await this.client.post(
      `/projects/${projectId}/ecosystem/channels/${enc}/grant/${subscriberProjectId}`,
      {}
    );
    return (response.data ?? {}) as Record<string, unknown>;
  }

  /**
   * DELETE /projects/{pid}/ecosystem/channels/{eventType}/grant/{subscriberPid}
   */
  async revokeSubscribe(
    projectId: number,
    eventType: string,
    subscriberProjectId: number
  ): Promise<Record<string, unknown>> {
    const enc = encodeURIComponent(eventType);
    return executeOrNotFoundFallback(
      async () =>
        (
          await this.client.delete(
            `/projects/${projectId}/ecosystem/channels/${enc}/grant/${subscriberProjectId}`
          )
        ).data as Record<string, unknown>,
      {}
    );
  }

  /**
   * GET /projects/{pid}/ecosystem/connections
   */
  async getConnections(projectId: number): Promise<EcosystemConnectionsPayload> {
    const response = await this.client.get(`/projects/${projectId}/ecosystem/connections`);
    return response.data as EcosystemConnectionsPayload;
  }

  /**
   * POST /projects/{pid}/ecosystem/channels/{eventType}/request
   */
  async requestAccess(
    ownerProjectId: number,
    eventType: string,
    message?: string
  ): Promise<Record<string, unknown>> {
    const enc = encodeURIComponent(eventType);
    const response = await this.client.post(
      `/projects/${ownerProjectId}/ecosystem/channels/${enc}/request`,
      { message: message ?? '' }
    );
    return (response.data ?? {}) as Record<string, unknown>;
  }
}
