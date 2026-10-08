import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import dts from 'rollup-plugin-dts';
import { readFileSync } from 'fs';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));

const commerceSubpackages = [
  'checkout',
  'cart',
  'orders',
  'shop',
  'merchant',
  'money',
  'topup',
  'storefront',
  'hosted',
  'errors',
  'entitlements',
  'sell',
  'subscription',
  'refund',
  'participant',
  'guidance',
  'surfaces',
];

function simpleSubpackageRollup(input, distDir, externals = ['eventemitter3', 'zod']) {
  const plugins = [
    resolve({ browser: true, preferBuiltins: false }),
    json(),
    commonjs(),
    typescript({ tsconfig: './tsconfig.json', declaration: false, declarationMap: false }),
    terser(),
  ];
  return [
    {
      input,
      output: [
        { file: `${distDir}/index.js`, format: 'cjs', sourcemap: true, inlineDynamicImports: true },
        { file: `${distDir}/index.esm.js`, format: 'esm', sourcemap: true, inlineDynamicImports: true },
      ],
      plugins,
      external: externals,
    },
    dtsBundle(input, `${distDir}/index.d.ts`),
  ];
}

/** Declaration bundle only — JS stays in the matching runtime config (one d.ts channel). */
function dtsBundle(input, file) {
  return {
    input,
    output: [{ file, format: 'esm' }],
    plugins: [dts()],
    external: [/\.css$/],
  };
}

function commerceSubpackageRollup(name) {
  const input = `src/commerce/${name}/index.ts`;
  const plugins = [
    resolve({ browser: true, preferBuiltins: false }),
    json(),
    commonjs(),
    typescript({ tsconfig: './tsconfig.json', declaration: false, declarationMap: false }),
    terser(),
  ];
  return [
    {
      input,
      output: [
        {
          file: `dist/commerce/${name}/index.js`,
          format: 'cjs',
          sourcemap: true,
          inlineDynamicImports: true,
        },
        {
          file: `dist/commerce/${name}/index.esm.js`,
          format: 'esm',
          sourcemap: true,
          inlineDynamicImports: true,
        },
      ],
      plugins,
      external: ['zod'],
    },
    dtsBundle(input, `dist/commerce/${name}/index.d.ts`),
  ];
}

export default [
  // Main build
  {
    input: 'src/index.ts',
    output: [
      {
        file: packageJson.main,
        format: 'cjs',
        sourcemap: true,
        name: 'AgentStackSDK',
        inlineDynamicImports: true
      },
      {
        file: packageJson.module,
        format: 'esm',
        sourcemap: true,
        exports: 'named',
        inlineDynamicImports: true
      }
    ],
    plugins: [
      resolve({
        browser: true,
        preferBuiltins: false
      }),
      json(),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        declarationMap: false,
      }),
      terser()
    ],
    external: [
      'eventemitter3',
      'react',
      'photoswipe',
      '@jsquash/avif',
      '@jsquash/webp',
      '@jsquash/jpeg',
      '@jsquash/resize',
      'blurhash',
    ]
  },
  // Photo compress worker (ESM) — sibling of ``index.esm.js`` for ``new URL(..., import.meta.url)``
  {
    input: 'src/media/photo/photoCompress.worker.ts',
    output: {
      file: 'dist/photoCompress.worker.js',
      format: 'esm',
      sourcemap: true,
    },
    plugins: [
      resolve({
        browser: true,
        preferBuiltins: false,
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        declarationMap: false,
        // Only @types/node — not the full @types/* set (jest/yargs/babel__traverse
        // .d.ts files break @rollup/plugin-typescript when loaded for this chunk).
        compilerOptions: {
          types: ['node'],
          lib: ['ES2022', 'WebWorker', 'DOM'],
        },
      }),
      terser(),
    ],
    external: ['@jsquash/avif', '@jsquash/webp', '@jsquash/jpeg', '@jsquash/resize', 'blurhash'],
  },
  {
    input: 'src/economy/index.ts',
    output: [
      { file: 'dist/economy/index.js', format: 'cjs', sourcemap: true, inlineDynamicImports: true },
      { file: 'dist/economy/index.esm.js', format: 'esm', sourcemap: true, inlineDynamicImports: true },
    ],
    plugins: [
      resolve({ browser: true, preferBuiltins: false }),
      commonjs(),
      typescript({ tsconfig: './tsconfig.json', declaration: false, declarationMap: false }),
      terser(),
    ],
    external: ['eventemitter3', 'zod'],
  },
  {
    input: 'src/guidance/index.ts',
    output: [
      { file: 'dist/guidance/index.js', format: 'cjs', sourcemap: true, inlineDynamicImports: true },
      { file: 'dist/guidance/index.esm.js', format: 'esm', sourcemap: true, inlineDynamicImports: true },
    ],
    plugins: [
      resolve({ browser: true, preferBuiltins: false }),
      commonjs(),
      typescript({ tsconfig: './tsconfig.json', declaration: false, declarationMap: false }),
      terser(),
    ],
    external: ['zod'],
  },
  {
    input: 'src/agents/index.ts',
    output: [
      { file: 'dist/agents/index.js', format: 'cjs', sourcemap: true, inlineDynamicImports: true },
      { file: 'dist/agents/index.esm.js', format: 'esm', sourcemap: true, inlineDynamicImports: true },
    ],
    plugins: [
      resolve({ browser: true, preferBuiltins: false }),
      commonjs(),
      typescript({ tsconfig: './tsconfig.json', declaration: false, declarationMap: false }),
      terser(),
    ],
    external: [],
  },
  {
    input: 'src/finance/index.ts',
    output: [
      { file: 'dist/finance/index.js', format: 'cjs', sourcemap: true, inlineDynamicImports: true },
      { file: 'dist/finance/index.esm.js', format: 'esm', sourcemap: true, inlineDynamicImports: true },
    ],
    plugins: [
      resolve({ browser: true, preferBuiltins: false }),
      commonjs(),
      typescript({ tsconfig: './tsconfig.json', declaration: false, declarationMap: false }),
      terser(),
    ],
    external: ['eventemitter3', 'zod'],
  },
  {
    input: 'src/fabric/index.ts',
    output: [
      { file: 'dist/fabric/index.js', format: 'cjs', sourcemap: true, inlineDynamicImports: true },
      { file: 'dist/fabric/index.esm.js', format: 'esm', sourcemap: true, inlineDynamicImports: true },
    ],
    plugins: [
      resolve({ browser: true, preferBuiltins: false }),
      commonjs(),
      typescript({ tsconfig: './tsconfig.json', declaration: false, declarationMap: false }),
      terser(),
    ],
    external: ['eventemitter3', 'zod'],
  },
  {
    input: 'src/cost/explorer.ts',
    output: [
      { file: 'dist/cost/explorer.js', format: 'cjs', sourcemap: true, inlineDynamicImports: true },
      { file: 'dist/cost/explorer.esm.js', format: 'esm', sourcemap: true, inlineDynamicImports: true },
    ],
    plugins: [
      resolve({ browser: true, preferBuiltins: false }),
      commonjs(),
      typescript({ tsconfig: './tsconfig.json', declaration: false, declarationMap: false }),
      terser(),
    ],
    external: ['eventemitter3', 'zod'],
  },
  {
    input: 'src/cost/index.ts',
    output: [
      { file: 'dist/cost/index.js', format: 'cjs', sourcemap: true, inlineDynamicImports: true },
      { file: 'dist/cost/index.esm.js', format: 'esm', sourcemap: true, inlineDynamicImports: true },
    ],
    plugins: [
      resolve({ browser: true, preferBuiltins: false }),
      commonjs(),
      typescript({ tsconfig: './tsconfig.json', declaration: false, declarationMap: false }),
      terser(),
    ],
    external: ['eventemitter3', 'zod'],
  },
  {
    input: 'src/commerce/assets/index.ts',
    output: [
      { file: 'dist/commerce/assets/index.js', format: 'cjs', sourcemap: true, inlineDynamicImports: true },
      { file: 'dist/commerce/assets/index.esm.js', format: 'esm', sourcemap: true, inlineDynamicImports: true },
    ],
    plugins: [
      resolve({ browser: true, preferBuiltins: false }),
      json(),
      commonjs(),
      typescript({ tsconfig: './tsconfig.json', declaration: false, declarationMap: false }),
      terser(),
    ],
    external: ['zod'],
  },
  {
    input: 'src/commerce/marketplace/index.ts',
    output: [
      { file: 'dist/commerce/marketplace/index.js', format: 'cjs', sourcemap: true, inlineDynamicImports: true },
      { file: 'dist/commerce/marketplace/index.esm.js', format: 'esm', sourcemap: true, inlineDynamicImports: true },
    ],
    plugins: [
      resolve({ browser: true, preferBuiltins: false }),
      commonjs(),
      typescript({ tsconfig: './tsconfig.json', declaration: false, declarationMap: false }),
      terser(),
    ],
    external: ['zod'],
  },
  ...commerceSubpackages.flatMap(commerceSubpackageRollup),
  {
    input: 'src/commerce/index.ts',
    output: [
      {
        file: 'dist/commerce/index.js',
        format: 'cjs',
        sourcemap: true,
        inlineDynamicImports: true,
      },
      {
        file: 'dist/commerce/index.esm.js',
        format: 'esm',
        sourcemap: true,
        inlineDynamicImports: true,
      },
    ],
    plugins: [
      resolve({ browser: true, preferBuiltins: false }),
      json(),
      commonjs(),
      typescript({ tsconfig: './tsconfig.json', declaration: false, declarationMap: false }),
      terser(),
    ],
    external: ['zod'],
  },
  {
    input: 'src/pwa/index.ts',
    output: [
      { file: 'dist/pwa/index.js', format: 'cjs', sourcemap: true, inlineDynamicImports: true },
      { file: 'dist/pwa/index.esm.js', format: 'esm', sourcemap: true, inlineDynamicImports: true },
    ],
    plugins: [
      resolve({ browser: true, preferBuiltins: false }),
      commonjs(),
      typescript({ tsconfig: './tsconfig.json', declaration: false, declarationMap: false }),
      terser(),
    ],
    external: ['eventemitter3'],
  },
  {
    input: 'src/mobile/index.ts',
    output: [
      { file: 'dist/mobile/index.js', format: 'cjs', sourcemap: true, inlineDynamicImports: true },
      { file: 'dist/mobile/index.esm.js', format: 'esm', sourcemap: true, inlineDynamicImports: true },
    ],
    plugins: [
      resolve({ browser: true, preferBuiltins: false }),
      commonjs(),
      typescript({ tsconfig: './tsconfig.json', declaration: false, declarationMap: false }),
      terser(),
    ],
    external: [],
  },
  {
    input: 'src/logic/blueprints/index.ts',
    output: [
      { file: 'dist/logic/blueprints/index.js', format: 'cjs', sourcemap: true, inlineDynamicImports: true },
      { file: 'dist/logic/blueprints/index.esm.js', format: 'esm', sourcemap: true, inlineDynamicImports: true },
    ],
    plugins: [
      resolve({ browser: true, preferBuiltins: false }),
      commonjs(),
      typescript({ tsconfig: './tsconfig.json', declaration: false, declarationMap: false }),
      terser(),
    ],
    external: [],
  },
  {
    input: 'src/capability-tasks/index.ts',
    output: [
      { file: 'dist/capability-tasks/index.js', format: 'cjs', sourcemap: true, inlineDynamicImports: true },
      { file: 'dist/capability-tasks/index.esm.js', format: 'esm', sourcemap: true, inlineDynamicImports: true },
    ],
    plugins: [
      resolve({ browser: true, preferBuiltins: false }),
      commonjs(),
      typescript({ tsconfig: './tsconfig.json', declaration: false, declarationMap: false }),
      terser(),
    ],
    external: ['zod'],
  },
  {
    input: 'src/manifest/index.ts',
    output: [
      { file: 'dist/manifest/index.js', format: 'cjs', sourcemap: true, inlineDynamicImports: true },
      { file: 'dist/manifest/index.esm.js', format: 'esm', sourcemap: true, inlineDynamicImports: true },
    ],
    plugins: [
      resolve({ browser: true, preferBuiltins: false }),
      commonjs(),
      typescript({ tsconfig: './tsconfig.json', declaration: false, declarationMap: false }),
      terser(),
    ],
    external: ['zod'],
  },
  {
    input: 'src/messaging/index.ts',
    output: [
      { file: 'dist/messaging/index.js', format: 'cjs', sourcemap: true, inlineDynamicImports: true },
      { file: 'dist/messaging/index.esm.js', format: 'esm', sourcemap: true, inlineDynamicImports: true },
    ],
    plugins: [
      resolve({ browser: true, preferBuiltins: false }),
      commonjs(),
      typescript({ tsconfig: './tsconfig.json', declaration: false, declarationMap: false }),
      terser(),
    ],
    external: [],
  },
  ...simpleSubpackageRollup('src/mcp/index.ts', 'dist/mcp', ['eventemitter3', 'zod']),
  ...simpleSubpackageRollup('src/workspace/index.ts', 'dist/workspace', ['eventemitter3', 'zod']),
  ...simpleSubpackageRollup('src/diagnostics/index.ts', 'dist/diagnostics', ['eventemitter3', 'zod']),
  ...simpleSubpackageRollup('src/public/services/index.ts', 'dist/services', ['eventemitter3', 'zod']),
  ...simpleSubpackageRollup('src/admin/hubCommerce.ts', 'dist/admin/hubCommerce', ['eventemitter3', 'zod']),
  ...simpleSubpackageRollup('src/admin/hubNeurocache.ts', 'dist/admin/hubNeurocache', ['eventemitter3', 'zod']),
  // Type definitions for entries that are not `simpleSubpackageRollup` (those already emit .d.ts).
  ...[
    ['src/index.ts', 'dist/index.d.ts'],
    ['src/capability-tasks/index.ts', 'dist/capability-tasks/index.d.ts'],
    ['src/manifest/index.ts', 'dist/manifest/index.d.ts'],
    ['src/messaging/index.ts', 'dist/messaging/index.d.ts'],
    ['src/economy/index.ts', 'dist/economy/index.d.ts'],
    ['src/finance/index.ts', 'dist/finance/index.d.ts'],
    ['src/fabric/index.ts', 'dist/fabric/index.d.ts'],
    ['src/cost/explorer.ts', 'dist/cost/explorer.d.ts'],
    ['src/cost/index.ts', 'dist/cost/index.d.ts'],
    ['src/guidance/index.ts', 'dist/guidance/index.d.ts'],
    ['src/agents/index.ts', 'dist/agents/index.d.ts'],
    ['src/commerce/assets/index.ts', 'dist/commerce/assets/index.d.ts'],
    ['src/commerce/marketplace/index.ts', 'dist/commerce/marketplace/index.d.ts'],
    ['src/commerce/index.ts', 'dist/commerce/index.d.ts'],
    ['src/pwa/index.ts', 'dist/pwa/index.d.ts'],
    ['src/mobile/index.ts', 'dist/mobile/index.d.ts'],
    ['src/logic/blueprints/index.ts', 'dist/logic/blueprints/index.d.ts'],
  ].map(([input, file]) => dtsBundle(input, file)),
];
