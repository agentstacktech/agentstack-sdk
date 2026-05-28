/**
 * Bundles RNNoise AudioWorklet + @jitsi/rnnoise-wasm sync glue into a single ESM file
 * for audioWorklet.addModule(url, { type: 'module' }).
 */
import * as esbuild from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'src/media/audio/bundled');
const outfile = path.join(outDir, 'noise-suppressor-worklet.bundle.js');

fs.mkdirSync(outDir, { recursive: true });

await esbuild.build({
  entryPoints: [path.join(root, 'src/media/audio/worklet-bundle-entry.ts')],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  outfile,
  logLevel: 'info',
  legalComments: 'none',
  sourcemap: false,
  // Minify to shave ~40% off the worklet bundle (WASM inside accounts for most
  // of the remainder and is already compact). AudioWorklet runs in a separate
  // realm, so aggressive mangling is safe — no external consumers reach in.
  minify: true,
});

console.log('Wrote', outfile);

// Mirror into dist/ as well so the rollup bundle + CJS/ESM consumers can resolve
// `media/audio/noise-suppressor-worklet.bundle.js` at runtime without a separate
// rollup copy-plugin pass (which races on Windows when both CJS+ESM writeBundle
// hooks try to overwrite the same destination).
const distOutDir = path.join(root, 'dist/media/audio');
fs.mkdirSync(distOutDir, { recursive: true });
const distOutFile = path.join(distOutDir, 'noise-suppressor-worklet.bundle.js');
fs.copyFileSync(outfile, distOutFile);
console.log('Mirrored ->', distOutFile);
