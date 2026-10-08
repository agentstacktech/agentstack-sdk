/**
 * Stable SHA-256 over SDK core build inputs (deploy skip + rollup-build early exit).
 * Gene: repo.platform.sdk.ai_surface.gen1
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findMonorepoFile } from '../../../scripts/monorepo-layout.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const packageRoot = path.resolve(__dirname, '..');

function constantsPyPath(root) {
  return findMonorepoFile(root, 'shared', 'constants.py');
}

const SKIP_DIR = new Set(['node_modules', 'generated', 'bundled']);
const SRC_EXT = new Set(['.ts', '.tsx']);

function walkSourceFiles(dir, out) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    if (name.isDirectory()) {
      if (SKIP_DIR.has(name.name)) continue;
      walkSourceFiles(path.join(dir, name.name), out);
      continue;
    }
    const ext = path.extname(name.name);
    if (!SRC_EXT.has(ext)) continue;
    out.push(path.join(dir, name.name));
  }
}

function hashFile(sha, filePath) {
  const rel = path.relative(packageRoot, filePath).replace(/\\/g, '/');
  sha.update(rel);
  sha.update('\0');
  sha.update(fs.readFileSync(filePath));
  sha.update('\0');
}

/**
 * @param {string} [root]
 * @returns {string} hex sha256
 */
export function computeSdkBuildInputHash(root = packageRoot) {
  const sha = crypto.createHash('sha256');
  const pkgJson = path.join(root, 'package.json');
  const lock = path.join(root, 'package-lock.json');
  const rollupCfg = path.join(root, 'rollup.config.js');
  const constantsPy = constantsPyPath(root);

  for (const f of [pkgJson, lock, rollupCfg, constantsPy].filter(Boolean)) {
    if (fs.existsSync(f)) {
      hashFile(sha, f);
    }
  }

  const srcRoot = path.join(root, 'src');
  const files = [];
  walkSourceFiles(srcRoot, files);
  files.sort((a, b) => a.localeCompare(b));
  for (const f of files) {
    hashFile(sha, f);
  }

  return sha.digest('hex');
}

export function readStoredBuildInputHash(root = packageRoot) {
  const stamp = path.join(root, 'dist', '.sdk-build-inputs.sha256');
  if (!fs.existsSync(stamp)) return null;
  return fs.readFileSync(stamp, 'utf8').trim() || null;
}

export function writeStoredBuildInputHash(hash, root = packageRoot) {
  const distDir = path.join(root, 'dist');
  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(path.join(distDir, '.sdk-build-inputs.sha256'), `${hash}\n`, 'utf8');
}

function latestTrackedMtimeMs(root = packageRoot) {
  let max = 0;
  const bump = (filePath) => {
    if (!fs.existsSync(filePath)) return;
    const t = fs.statSync(filePath).mtimeMs;
    if (t > max) max = t;
  };
  bump(path.join(root, 'package.json'));
  bump(path.join(root, 'package-lock.json'));
  bump(path.join(root, 'rollup.config.js'));
  const constantsPy = constantsPyPath(root);
  if (constantsPy) bump(constantsPy);

  const srcRoot = path.join(root, 'src');
  const files = [];
  walkSourceFiles(srcRoot, files);
  for (const f of files) {
    const t = fs.statSync(f).mtimeMs;
    if (t > max) max = t;
  }
  return max;
}

/**
 * Fast deploy/preflight check: stamp exists and no tracked input is newer than stamp.
 * Set SDK_BUILD_VERIFY_HASH=1 to also recompute SHA-256 (CI / debug).
 */
export function isSdkBuildStampFresh(root = packageRoot) {
  const stampPath = path.join(root, 'dist', '.sdk-build-inputs.sha256');
  const marker = path.join(root, 'dist', 'index.esm.js');
  if (!fs.existsSync(stampPath) || !fs.existsSync(marker)) {
    return false;
  }
  if (fs.statSync(marker).size < 512) {
    return false;
  }
  const stored = readStoredBuildInputHash(root);
  if (!stored || stored.length < 32) {
    return false;
  }
  const stampMtime = fs.statSync(stampPath).mtimeMs;
  if (latestTrackedMtimeMs(root) > stampMtime) {
    return false;
  }
  if (process.env.SDK_BUILD_VERIFY_HASH === '1') {
    return stored === computeSdkBuildInputHash(root);
  }
  return true;
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const mode = process.argv[2] ?? 'compute';
  if (mode === 'compute') {
    process.stdout.write(`${computeSdkBuildInputHash()}\n`);
  } else if (mode === 'check') {
    const ok = isSdkBuildStampFresh();
    process.stdout.write(ok ? 'fresh\n' : 'stale\n');
    process.exit(ok ? 0 : 1);
  } else {
    console.error('usage: sdk-build-input-hash.mjs [compute|check]');
    process.exit(2);
  }
}
