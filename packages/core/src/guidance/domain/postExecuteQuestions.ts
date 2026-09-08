import type { Playbook, PlaybookNode } from '../types/playbookTypes';

export type QuestionNode = Extract<PlaybookNode, { kind: 'question' }>;

/** Discover vs mid-path question (`docs/adr/COMPASS_POST_EXECUTION_QUESTIONS.md`). */
export function questionPhase(node: QuestionNode): 'discover' | 'post_execute' {
  if (node.phase === 'post_execute' || node.afterNodeId) return 'post_execute';
  return 'discover';
}

export function isPostExecuteQuestion(node: PlaybookNode): node is QuestionNode {
  return node.kind === 'question' && questionPhase(node) === 'post_execute';
}

export function postExecuteQuestionsAfter(playbook: Playbook, anchorId: string): QuestionNode[] {
  return Object.values(playbook.nodes).filter(
    (n): n is QuestionNode => isPostExecuteQuestion(n) && n.afterNodeId === anchorId,
  );
}

export function resolveNextFromQuestion(
  node: QuestionNode,
  answers: Record<string, unknown>,
): string | null {
  for (const opt of node.options) {
    if (!opt.set) continue;
    if (Object.entries(opt.set).every(([k, v]) => answers[k] === v)) return opt.next;
  }
  return null;
}
