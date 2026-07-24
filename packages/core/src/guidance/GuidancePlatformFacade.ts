/**
 * Thin guidance facade on sdk.platform (`sdk.guidance.gen1`).
 */
import type { HTTPClient } from '../client/http-client';
import { GuidanceClient } from './client/GuidanceClient';

export class GuidancePlatformFacade {
  constructor(private readonly http: HTTPClient) {}

  /** Project-scoped Guidance REST client. */
  forProject(projectId: number): GuidanceClient {
    return new GuidanceClient(this.http, projectId);
  }
}
