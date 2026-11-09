/**
 * Discovery read helpers on AgentProtocol (WS-C1).
 */

import type { HTTPClient } from '../client/http-client';
import {
  discoveryDescribeMany,
  type DescribeManyResult,
  type DiscoveryDescribeManyParams,
} from '../mcp/discoveryDescribeMany';

export class DiscoveryProtocol {
  constructor(private readonly http: HTTPClient) {}

  /** Batch slim/default describe — ≤6 actions, one MCP execute step. */
  describeMany(params: DiscoveryDescribeManyParams): Promise<DescribeManyResult> {
    return discoveryDescribeMany(this.http, params);
  }
}

export type { DescribeManyResult, DiscoveryDescribeManyParams };
