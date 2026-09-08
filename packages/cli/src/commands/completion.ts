/**
 * Shell completions — generated from ALL_COMMANDS (single SoT).
 * Usage: eval "$(agentstack completion bash)"
 * Genetic tag: repo.tooling.user_cli.gen1
 */

import { ALL_COMMANDS } from './registry.js';

function topLevel(): string[] {
  const tops = new Set<string>();
  for (const c of ALL_COMMANDS) tops.add(c.name.split(' ')[0]!);
  return [...tops].sort();
}

function subcommands(prefix: string): string[] {
  const out: string[] = [];
  for (const c of ALL_COMMANDS) {
    const parts = c.name.split(' ');
    if (parts[0] === prefix && parts.length > 1) {
      out.push(parts.slice(1).join(' '));
    }
  }
  return [...new Set(out)].sort();
}

function commandWords(): string[] {
  const words = new Set<string>();
  for (const c of ALL_COMMANDS) {
    words.add(c.name.split(' ')[0]!);
    words.add(c.name);
  }
  return [...words].sort();
}

function bashSubCases(): string {
  const lines: string[] = [];
  for (const top of topLevel()) {
    if (top === 'completion') {
      lines.push(
        `    completion) COMPREPLY=( $(compgen -W "bash zsh powershell" -- "$cur") ) ;;`,
      );
      continue;
    }
    const subs = subcommands(top);
    if (!subs.length) continue;
    lines.push(
      `    ${top}) COMPREPLY=( $(compgen -W "${subs.join(' ')}" -- "$cur") ) ;;`,
    );
  }
  return lines.join('\n');
}

/** Print a shell completion script for bash | zsh | powershell. */
export function completionScript(shell: string): string {
  const tops = topLevel().join(' ');
  const all = commandWords().join(' ');
  switch (shell) {
    case 'bash':
      return `# agentstack bash completion — gene repo.tooling.user_cli.gen1
_agentstack() {
  local cur="\${COMP_WORDS[COMP_CWORD]}"
  local tops="${tops}"
  case "\${COMP_WORDS[1]}" in
${bashSubCases()}
    *) COMPREPLY=( $(compgen -W "$tops" -- "$cur") ) ;;
  esac
}
complete -F _agentstack agentstack
`;
    case 'zsh':
      return `#compdef agentstack
# agentstack zsh completion — gene repo.tooling.user_cli.gen1
_arguments '1:command:(${tops})' '*:arg:_files'
`;
    case 'powershell':
      return `# agentstack PowerShell completion — gene repo.tooling.user_cli.gen1
Register-ArgumentCompleter -Native -CommandName agentstack -ScriptBlock {
  param($wordToComplete, $commandAst, $cursorPosition)
  $cmds = @(${all
    .split(' ')
    .map((w) => `'${w}'`)
    .join(',')})
  $cmds | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
    [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
  }
}
`;
    default:
      throw new Error(`usage: completion <bash|zsh|powershell> (got ${shell})`);
  }
}
