import type { HTTPClient } from '../../client/http-client';
import type {
  HostedManifestResponse,
  HostedPublishResponse,
} from './hostedStorefrontTypes';

/** REST facade for hosted vitrine bridge (`/api/commerce/storefront/hosted/*`). */
export class HostedStorefrontClient {
  constructor(private readonly http: HTTPClient) {}

  async getManifest(projectId: number): Promise<HostedManifestResponse> {
    const response = await this.http.get('/commerce/storefront/hosted/manifest', {
      params: { project_id: projectId },
    });
    return (response.data ?? response) as HostedManifestResponse;
  }

  async publish(
    projectId: number,
    options?: { bucketName?: string },
  ): Promise<HostedPublishResponse> {
    const response = await this.http.post('/commerce/storefront/hosted/publish', {
      project_id: projectId,
      ...(options?.bucketName?.trim()
        ? { bucket_name: options.bucketName.trim() }
        : {}),
    });
    return (response.data ?? response) as HostedPublishResponse;
  }
}

export type {
  HostedManifestResponse,
  HostedPublishResponse,
  HostedStorefrontManifest,
} from './hostedStorefrontTypes';
