/**
 * MCP hints from task manifests (`sdk.capability_tasks.gen1`).
 */

export interface TaskMcpHint {
  taskId: string;
  domain: string;
  verb: string;
  suggestedTool: string;
}

export interface TaskManifestLike {
  taskId: string;
  domain: string;
  mcp?: { toolPrefix?: string };
}

export function taskManifestToMcpHints(manifest: TaskManifestLike): TaskMcpHint[] {
  const prefix = manifest.mcp?.toolPrefix ?? manifest.domain.split('.')[0];
  const verb = manifest.taskId.split('.').slice(-1)[0] ?? 'run';
  return [
    {
      taskId: manifest.taskId,
      domain: manifest.domain,
      verb,
      suggestedTool: `${prefix}.task.${manifest.taskId.replace(/\./g, '_')}`,
    },
  ];
}
