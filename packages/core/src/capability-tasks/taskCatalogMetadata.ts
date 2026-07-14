/**
 * Read-only task catalog for getModuleCatalog (`sdk.capability_tasks.gen1`).
 * Keep in sync with frontend `TASK_CAPABILITY_MANIFESTS` (audit:capability-tasks).
 */
export type TaskCatalogEntry = {
  taskId: string;
  domain: string;
  comfortBudget: number;
  executionMode: 'inline' | 'split' | 'immersive' | 'companion';
  shells: Array<'dev' | 'user'>;
};

export const TASK_CATALOG_METADATA: readonly TaskCatalogEntry[] = [
  { taskId: 'storage.upload', domain: 'storage.file', comfortBudget: 3, executionMode: 'inline', shells: ['dev', 'user'] },
  { taskId: 'storage.delete', domain: 'storage.file', comfortBudget: 3, executionMode: 'split', shells: ['dev', 'user'] },
  { taskId: 'storage.move', domain: 'storage.file', comfortBudget: 3, executionMode: 'split', shells: ['dev', 'user'] },
  { taskId: 'hosting.deploy_zip', domain: 'hosting.site', comfortBudget: 3, executionMode: 'split', shells: ['dev', 'user'] },
  { taskId: 'hosting.publish', domain: 'hosting.site', comfortBudget: 3, executionMode: 'split', shells: ['dev', 'user'] },
  { taskId: 'project_hosting.ladder_host', domain: 'hosting.project', comfortBudget: 2, executionMode: 'split', shells: ['dev', 'user'] },
  { taskId: 'project_hosting.complete_sell', domain: 'hosting.project', comfortBudget: 3, executionMode: 'split', shells: ['dev', 'user'] },
  { taskId: 'hosting.edit_file', domain: 'hosting.site.file', comfortBudget: 3, executionMode: 'split', shells: ['dev'] },
  { taskId: 'integrate.connect', domain: 'integrations.connection', comfortBudget: 3, executionMode: 'split', shells: ['dev'] },
  { taskId: 'integrate.replay_delivery', domain: 'integrations.delivery', comfortBudget: 3, executionMode: 'split', shells: ['dev'] },
  { taskId: 'bots.manage', domain: 'bots.fleet', comfortBudget: 3, executionMode: 'split', shells: ['dev', 'user'] },
  { taskId: 'bots.quick_start', domain: 'bots.fleet', comfortBudget: 4, executionMode: 'split', shells: ['dev', 'user'] },
  { taskId: 'bots.connect.messaging', domain: 'bots.fleet', comfortBudget: 3, executionMode: 'split', shells: ['dev', 'user'] },
  { taskId: 'bots.attach_channel', domain: 'bots.fleet', comfortBudget: 3, executionMode: 'split', shells: ['dev'] },
  { taskId: 'bots.go_live', domain: 'bots.fleet', comfortBudget: 2, executionMode: 'split', shells: ['dev'] },
  { taskId: 'bots.launch_channel', domain: 'bots.fleet', comfortBudget: 3, executionMode: 'split', shells: ['dev', 'user'] },
  { taskId: 'bots.simulate_start', domain: 'bots.fleet', comfortBudget: 2, executionMode: 'inline', shells: ['dev', 'user'] },
  { taskId: 'bots.inbox', domain: 'bots.fleet', comfortBudget: 2, executionMode: 'split', shells: ['dev', 'user'] },
  { taskId: 'bots.broadcast', domain: 'bots.fleet', comfortBudget: 3, executionMode: 'inline', shells: ['dev', 'user'] },
  { taskId: 'agents.create', domain: 'agents.agent', comfortBudget: 3, executionMode: 'immersive', shells: ['dev'] },
  { taskId: 'agents.run', domain: 'agents.agent', comfortBudget: 3, executionMode: 'split', shells: ['dev'] },
  { taskId: 'crm.add_contact', domain: 'crm.contact', comfortBudget: 2, executionMode: 'inline', shells: ['dev', 'user'] },
  { taskId: 'crm.create_deal', domain: 'crm.deal', comfortBudget: 2, executionMode: 'inline', shells: ['dev', 'user'] },
  { taskId: 'crm.import_contacts', domain: 'crm.contact', comfortBudget: 3, executionMode: 'inline', shells: ['dev', 'user'] },
  { taskId: 'assets.create_digital', domain: 'commerce.asset', comfortBudget: 3, executionMode: 'split', shells: ['dev', 'user'] },
  { taskId: 'assets.manage_catalog', domain: 'commerce.asset', comfortBudget: 2, executionMode: 'split', shells: ['dev', 'user'] },
  { taskId: 'assets.publish_listing', domain: 'commerce.asset', comfortBudget: 2, executionMode: 'split', shells: ['dev', 'user'] },
  { taskId: 'commerce.bulk_seed_storefront', domain: 'commerce.asset', comfortBudget: 3, executionMode: 'split', shells: ['dev', 'user'] },
  { taskId: 'commerce.magic_fill_product', domain: 'commerce.asset', comfortBudget: 2, executionMode: 'split', shells: ['dev', 'user'] },
  { taskId: 'commerce.studio_quick_create', domain: 'commerce.asset', comfortBudget: 3, executionMode: 'split', shells: ['dev', 'user'] },
  { taskId: 'commerce.one_click_fill_catalog', domain: 'commerce.asset', comfortBudget: 2, executionMode: 'split', shells: ['dev', 'user'] },
  { taskId: 'commerce.studio_publish_vitrine', domain: 'commerce.asset', comfortBudget: 3, executionMode: 'split', shells: ['dev', 'user'] },
  { taskId: 'commerce.start_selling', domain: 'commerce.sell', comfortBudget: 2, executionMode: 'inline', shells: ['user', 'dev'] },
  { taskId: 'commerce.share_store', domain: 'commerce.sell', comfortBudget: 1, executionMode: 'inline', shells: ['user', 'dev'] },
  { taskId: 'commerce.buy_listing', domain: 'commerce.storefront', comfortBudget: 3, executionMode: 'immersive', shells: ['user', 'dev'] },
  { taskId: 'commerce.hosted_storefront.open_demo', domain: 'commerce.storefront', comfortBudget: 2, executionMode: 'immersive', shells: ['user', 'dev'] },
  { taskId: 'wallet.view_balance', domain: 'wallet.account', comfortBudget: 2, executionMode: 'inline', shells: ['dev', 'user'] },
  { taskId: 'project.settings.patch', domain: 'project.settings', comfortBudget: 3, executionMode: 'immersive', shells: ['dev'] },
  { taskId: 'project.delete.safe', domain: 'project.lifecycle', comfortBudget: 3, executionMode: 'immersive', shells: ['dev'] },
  { taskId: 'support.open_thread', domain: 'support.thread', comfortBudget: 3, executionMode: 'inline', shells: ['user'] },
  { taskId: 'logic.create_rule', domain: 'logic.rule', comfortBudget: 3, executionMode: 'inline', shells: ['dev'] },
  { taskId: 'logic.install_template', domain: 'logic.rule', comfortBudget: 2, executionMode: 'inline', shells: ['dev', 'user'] },
  { taskId: 'project.create', domain: 'project.lifecycle', comfortBudget: 2, executionMode: 'inline', shells: ['dev'] },
  { taskId: 'project.members.invite', domain: 'project.members', comfortBudget: 3, executionMode: 'immersive', shells: ['dev'] },
  { taskId: 'project.rbac.grant', domain: 'project.rbac', comfortBudget: 3, executionMode: 'immersive', shells: ['dev'] },
  { taskId: 'auth.fix_api_key', domain: 'auth.credentials', comfortBudget: 2, executionMode: 'inline', shells: ['dev'] },
  { taskId: 'fabric.marketplace.browse', domain: 'fabric.marketplace', comfortBudget: 3, executionMode: 'inline', shells: ['dev', 'user'] },
  { taskId: 'fabric.federation.grant', domain: 'fabric.federation', comfortBudget: 3, executionMode: 'inline', shells: ['dev', 'user'] },
  { taskId: 'fabric.hub.open', domain: 'fabric.hub', comfortBudget: 2, executionMode: 'inline', shells: ['dev', 'user'] },
  { taskId: 'fabric.notifications.inbox', domain: 'fabric.notifications', comfortBudget: 2, executionMode: 'inline', shells: ['dev', 'user'] },
  { taskId: 'fabric.moderator.inbox', domain: 'fabric.moderator', comfortBudget: 2, executionMode: 'inline', shells: ['dev'] },
];
