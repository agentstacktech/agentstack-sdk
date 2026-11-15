/**
 * Public hosted changelog JSON Feed (`/s/{pid}/{bucket}/changelog.json`).
 * Gene: `core.hosting.bucket.gen1`
 */

import type { ChangelogFeedItemV1, ChangelogFeedV1 } from './publicChangelogTypes';

export function changelogPaths(
  projectId: number,
  bucket: string,
  preview = false,
): { json: string; html: string } {
  const slug = preview ? `${bucket}--dev` : bucket;
  const prefix = `/s/${projectId}/${slug}`;
  return { json: `${prefix}/changelog.json`, html: `${prefix}/changelog.html` };
}

export function changelogUrl(
  origin: string,
  projectId: number,
  bucket: string,
  preview = false,
): string {
  const root = origin.replace(/\/$/, '');
  return `${root}${changelogPaths(projectId, bucket, preview).json}`;
}

export async function fetchChangelogFeed(
  url: string,
  init?: RequestInit,
): Promise<ChangelogFeedV1> {
  const res = await fetch(url, { ...init, credentials: 'omit' });
  if (!res.ok) {
    throw new Error(`changelog_feed_http_${res.status}`);
  }
  return (await res.json()) as ChangelogFeedV1;
}

export function unseenItems(
  feed: ChangelogFeedV1,
  lastSeenId?: string,
): ChangelogFeedItemV1[] {
  const items = feed.items ?? [];
  if (!lastSeenId) {
    return items;
  }
  const out: ChangelogFeedItemV1[] = [];
  for (const item of items) {
    if (item.id === lastSeenId) {
      break;
    }
    out.push(item);
  }
  return out;
}

export class PublicChangelogClient {
  constructor(private readonly origin: string) {}

  getUrl(projectId: number, bucket: string, preview = false): string {
    return changelogUrl(this.origin, projectId, bucket, preview);
  }

  async getFeed(
    projectId: number,
    bucket: string,
    opts?: { preview?: boolean; signal?: AbortSignal },
  ): Promise<ChangelogFeedV1> {
    const url = this.getUrl(projectId, bucket, opts?.preview ?? false);
    return fetchChangelogFeed(url, { signal: opts?.signal });
  }
}