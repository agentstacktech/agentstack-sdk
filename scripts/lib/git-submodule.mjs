import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  ALLOWED_SDK_REPO_HOSTS,
  DEFAULT_SDK_REPO_URL,
} from './sdk-submodule-constants.mjs';

function git(cwd, args) {
  return spawnSync('git', args, { cwd, encoding: 'utf8' });
}

export function assertSdkRepoUrlAllowed(url) {
  const normalized = url.replace(/\.git$/, '').trim().toLowerCase();
  if (ALLOWED_SDK_REPO_HOSTS.some((h) => normalized.includes(h.toLowerCase()))) {
    return true;
  }
  const extra = process.env.SDK_SUBMODULE_URL_ALLOWLIST_EXTRA?.split(',').map((s) => s.trim());
  if (extra?.some((e) => normalized.includes(e.toLowerCase()))) return true;
  return false;
}

export function readSubmoduleRef(targetRoot, submodulePath) {
  const r = git(targetRoot, ['rev-parse', `${submodulePath}^{commit}`]);
  if (r.status !== 0) return null;
  return r.stdout.trim() || null;
}

export function parseGitmodules(targetRoot) {
  const gitmodulesPath = path.join(targetRoot, '.gitmodules');
  if (!fs.existsSync(gitmodulesPath)) return [];
  const text = fs.readFileSync(gitmodulesPath, 'utf8');
  const entries = [];
  let current = {};
  for (const line of text.split(/\r?\n/)) {
    const mSub = line.match(/^\[submodule "(.+)"\]/);
    if (mSub) {
      if (current.path || current.url) entries.push({ ...current });
      current = { name: mSub[1] };
      continue;
    }
    const mPath = line.match(/^\s*path\s*=\s*(.+)$/);
    const mUrl = line.match(/^\s*url\s*=\s*(.+)$/);
    if (mPath) current.path = mPath[1].trim();
    if (mUrl) current.url = mUrl[1].trim();
  }
  if (current.path || current.url) entries.push(current);
  return entries;
}

export function sdkSubmoduleLooksValid(targetRoot, submoduleRelPath) {
  const abs = path.join(targetRoot, submoduleRelPath);
  return fs.existsSync(path.join(abs, 'packages', 'core', 'package.json'));
}

export function ensureSubmoduleAtRef(targetRoot, opts) {
  const url = opts.url || DEFAULT_SDK_REPO_URL;
  if (!assertSdkRepoUrlAllowed(url)) {
    throw new Error(`SDK submodule URL not allowed: ${url}`);
  }
  const relPath = opts.path;
  const absPath = path.join(targetRoot, relPath);
  const existing = parseGitmodules(targetRoot).find((e) => e.path === relPath);

  if (!existing) {
    const add = git(targetRoot, ['submodule', 'add', '--force', url, relPath]);
    if (add.status !== 0) {
      throw new Error(add.stderr || add.stdout || 'git submodule add failed');
    }
  }

  const updateArgs = ['submodule', 'update', '--init'];
  if (opts.shallow) updateArgs.push('--depth', '1');
  updateArgs.push(relPath);
  const upd = git(targetRoot, updateArgs);
  if (upd.status !== 0) {
    throw new Error(upd.stderr || upd.stdout || 'git submodule update failed');
  }

  if (opts.ref) {
    const co = git(absPath, ['checkout', '--detach', opts.ref]);
    if (co.status !== 0) {
      throw new Error(co.stderr || co.stdout || `checkout ${opts.ref} failed in submodule`);
    }
  }

  return readSubmoduleRef(targetRoot, relPath);
}

export function resolveRemoteTagToSha(tag, url = DEFAULT_SDK_REPO_URL) {
  const r = spawnSync('git', ['ls-remote', url, `refs/tags/${tag}`], { encoding: 'utf8' });
  if (r.status !== 0 || !r.stdout.trim()) return null;
  const sha = r.stdout.trim().split('\n')[0].split(/\s+/)[0];
  return sha || null;
}

export function detectSubmoduleDrift(targetRoot, sdkSource, { strict = false } = {}) {
  if (!sdkSource?.ref || !sdkSource?.path) return { drift: false };
  const head = readSubmoduleRef(targetRoot, sdkSource.path);
  if (!head) {
    return { drift: true, severity: 'error', reason: 'submodule missing or empty' };
  }
  if (head === sdkSource.ref) return { drift: false, head };
  return {
    drift: true,
    severity: 'error',
    reason: 'sha mismatch',
    head,
    expected: sdkSource.ref,
    strict,
  };
}
