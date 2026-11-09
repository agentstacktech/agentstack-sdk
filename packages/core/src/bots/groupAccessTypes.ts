/** Group access + routing_gates — mirrors REST OpenAPI and MCP bots.acl.list (core.bots.group_access.gen1). */

export type GroupAccessRoutingGatesSeverity = 'blocking' | 'info';

export type GroupAccessRoutingGatesBlocker = {
  id?: string;
  severity?: GroupAccessRoutingGatesSeverity | string;
  message?: string;
};

export type GroupAccessRoutingGatesFlags = {
  has_by_chat_leaf?: boolean;
  responsible_handle_present?: boolean;
  responsible_slug_in_message_bus_registry?: boolean;
  bus_registry_readable?: boolean;
  manager_webhook_connected?: boolean;
};

export type GroupAccessRoutingGatesNextAction = {
  action?: string;
  why?: string;
};

export type GroupAccessRoutingGates = {
  session_mode?: string;
  order_routing_live?: boolean;
  gates?: GroupAccessRoutingGatesFlags;
  blockers?: GroupAccessRoutingGatesBlocker[];
  next_actions?: GroupAccessRoutingGatesNextAction[];
  launch_blocker_id?: string;
};

export type BotGroupAccessGetResponse = {
  chat_key?: string;
  config?: Record<string, unknown> | null;
  session_mode?: string;
  mode_source?: string;
  conversation_id?: string;
  /** private | group | unknown — home channel classification */
  chat_kind?: string;
  session_key_mismatch?: boolean;
  order_routing_live?: boolean;
  order_template_enabled?: boolean;
  recovery_hint?: string;
  /** Populated when config is null; otherwise prefer routing_gates.next_actions */
  next_actions?: GroupAccessRoutingGatesNextAction[];
  /** Primary blocking gate — mirrors MCP bots.acl.list when config is null */
  launch_blocker_id?: string;
  routing_gates: GroupAccessRoutingGates;
};
