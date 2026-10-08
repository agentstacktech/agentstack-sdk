/**
 * Run a single Rollup config entry (fresh Node heap). Invoked by rollup-build.mjs.
 * Gene: repo.platform.sdk.ai_surface.gen1 — deploy preflight OOM fix (monolithic rollup -c).
 */
import { rollup } from 'rollup';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const indexRaw = process.env.ROLLUP_CONFIG_INDEX ?? '';
const index = Number.parseInt(indexRaw, 10);
const totalRaw = process.env.ROLLUP_CONFIG_TOTAL ?? '';
const total = totalRaw ? Number.parseInt(totalRaw, 10) : NaN;

if (!Number.isFinite(index) || index < 0) {
  console.error('rollup-run-one: ROLLUP_CONFIG_INDEX must be a non-negative integer');
  process.exit(1);
}

const configUrl = pathToFileURL(path.join(packageRoot, 'rollup.config.js')).href;
const { default: configs } = await import(configUrl);
if (!Array.isArray(configs) || index >= configs.length) {
  console.error(`rollup-run-one: no config at index ${index} (length ${configs?.length ?? 0})`);
  process.exit(1);
}

const config = configs[index];
const inputLabel =
  typeof config.input === 'string'
    ? config.input
    : Array.isArray(config.input)
      ? config.input.join(', ')
      : String(config.input);
const progress = Number.isFinite(total) ? `[${index + 1}/${total}] ` : '';
const outFiles = (Array.isArray(config.output) ? config.output : [config.output])
  .map((o) => o.file)
  .filter(Boolean)
  .join(', ');
console.log(`${progress}${inputLabel} → ${outFiles || '(outputs)'}...`);

const bundle = await rollup(config);
try {
  const outputs = Array.isArray(config.output) ? config.output : [config.output];
  for (const output of outputs) {
    await bundle.write(output);
  }
} finally {
  await bundle.close();
}
