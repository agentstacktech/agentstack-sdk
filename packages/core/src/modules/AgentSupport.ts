/**
 * Project support REST facade — ``/api/support/*``.
 *
 * Prefer ``sdk.support`` over ad-hoc ``httpClient`` paths for integrations and widgets.
 *
 * Genetic tag: ``sdk.support.gen2``
 */

import type { HTTPClient } from '../client/http-client';
import {
  supportAssignTicket,
  supportGetConfig,
  supportGetEligibility,
  supportGetInbox,
  supportGetMeProjectRoles,
  supportGetMyThread,
  supportGetStaffThread,
  supportPostStaffThreadMessage,
  supportPostUserMessage,
  supportPutConfig,
  supportRequestHuman,
  supportSearchProjects,
  supportTransitionTicket,
} from '../supportRest';

export class AgentSupport {
  constructor(private readonly http: HTTPClient) {}

  getMeProjectRoles() {
    return supportGetMeProjectRoles(this.http);
  }

  getEligibility(params: { project_ids: number[] }) {
    return supportGetEligibility(this.http, params);
  }

  searchProjects(params: { q?: string; limit?: number }) {
    return supportSearchProjects(this.http, params);
  }

  getMyThread(params: { project_id: number; since_seq?: number; limit?: number }) {
    return supportGetMyThread(this.http, params);
  }

  postUserMessage(body: {
    project_id: number;
    body: string;
    attachments?: unknown[] | null;
    client_message_id?: string | null;
  }) {
    return supportPostUserMessage(this.http, body);
  }

  getInbox(params: { project_id: number; limit?: number; status?: string; assignee_user_id?: number }) {
    return supportGetInbox(this.http, params);
  }

  getConfig(params: { project_id: number }) {
    return supportGetConfig(this.http, params);
  }

  putConfig(params: { project_id: number }, body: { patch: Record<string, unknown> }) {
    return supportPutConfig(this.http, params, body);
  }

  getStaffThread(params: {
    project_id: number;
    channel_user_id: number;
    since_seq?: number;
    limit?: number;
  }) {
    return supportGetStaffThread(this.http, params);
  }

  postStaffThreadMessage(params: { project_id: number; channel_user_id: number; body: string }) {
    return supportPostStaffThreadMessage(this.http, params);
  }

  transitionTicket(params: {
    project_id: number;
    channel_user_id: number;
    ticket_id: string;
    status: string;
    reason?: string;
  }) {
    return supportTransitionTicket(this.http, params);
  }

  assignTicket(params: {
    project_id: number;
    channel_user_id: number;
    ticket_id: string;
    assignee_user_id?: number | null;
  }) {
    return supportAssignTicket(this.http, params);
  }

  requestHuman(params: { project_id: number; ticket_id: string }) {
    return supportRequestHuman(this.http, params);
  }
}
