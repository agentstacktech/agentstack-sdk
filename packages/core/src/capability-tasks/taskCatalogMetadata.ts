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
  { taskId: 'hosting.deploy_zip', domain: 'hosting.site', comfortBudget: 3, executionMode: 'split', shells: ['dev'] },
  { taskId: 'hosting.publish', domain: 'hosting.site', comfortBudget: 3, executionMode: 'split', shells: ['dev'] },
  { taskId: 'hosting.edit_file', domain: 'hosting.site.file', comfortBudget: 3, executionMode: 'split', shells: ['dev'] },
  { taskId: 'integrate.connect', domain: 'integrations.connection', comfortBudget: 3, executionMode: 'split', shells: ['dev'] },
  { taskId: 'integrate.replay_delivery', domain: 'integrations.delivery', comfortBudget: 3, executionMode: 'split', shells: ['dev'] },
  { taskId: 'agents.create', domain: 'agents.agent', comfortBudget: 3, executionMode: 'immersive', shells: ['dev'] },
  { taskId: 'agents.run', domain: 'agents.agent', comfortBudget: 3, executionMode: 'split', shells: ['dev'] },
  { taskId: 'assets.create_digital', domain: 'commerce.asset', comfortBudget: 3, executionMode: 'split', shells: ['dev', 'user'] },
  { taskId: 'assets.manage_catalog', domain: 'commerce.asset', comfortBudget: 2, executionMode: 'split', shells: ['dev', 'user'] },
  { taskId: 'assets.publish_listing', domain: 'commerce.asset', comfortBudget: 2, executionMode: 'split', shells: ['dev', 'user'] },
  { taskId: 'commerce.buy_listing', domain: 'commerce.storefront', comfortBudget: 3, executionMode: 'immersive', shells: ['user', 'dev'] },
  { taskId: 'wallet.view_balance', domain: 'wallet.account', comfortBudget: 2, executionMode: 'inline', shells: ['dev', 'user'] },
  { taskId: 'project.settings.patch', domain: 'project.settings', comfortBudget: 3, executionMode: 'immersive', shells: ['dev'] },
  { taskId: 'project.delete.safe', domain: 'project.lifecycle', comfortBudget: 3, executionMode: 'immersive', shells: ['dev'] },
  { taskId: 'support.open_thread', domain: 'support.thread', comfortBudget: 3, executionMode: 'inline', shells: ['user'] },
  { taskId: 'logic.create_rule', domain: 'logic.rule', comfortBudget: 3, executionMode: 'split', shells: ['dev'] },
  { taskId: 'project.create', domain: 'project.lifecycle', comfortBudget: 2, executionMode: 'inline', shells: ['dev'] },
  { taskId: 'project.members.invite', domain: 'project.members', comfortBudget: 3, executionMode: 'immersive', shells: ['dev'] },
  { taskId: 'project.rbac.grant', domain: 'project.rbac', comfortBudget: 3, executionMode: 'immersive', shells: ['dev'] },
];
