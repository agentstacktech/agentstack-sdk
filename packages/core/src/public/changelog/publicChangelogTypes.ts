/** JSON Feed 1.1 + AgentStack extension for hosted patch notes. */

export interface ChangelogFeedItemV1 {
  id: string;
  url?: string;
  date_published?: string;
  title: string;
  content_text?: string;
  tags?: string[];
  /** Work Graph node ids from `AgentStack-Task:` commit trailers. */
  task_ids?: string[];
}

export interface ChangelogFeedAgentStackMeta {
  schema: string;
  ref: string;
  tip: string;
  sources_sha: string;
  next_cursor: string | null;
  build_target: 'prod' | 'dev';
}

export interface ChangelogFeedV1 {
  version: string;
  title: string;
  feed_url?: string;
  home_page_url?: string;
  items: ChangelogFeedItemV1[];
  _agentstack?: ChangelogFeedAgentStackMeta;
}