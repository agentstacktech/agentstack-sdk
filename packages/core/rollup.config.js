import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';
import dts from 'rollup-plugin-dts';
import { readFileSync } from 'fs';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));

const commerceSubpackages = ['checkout', 'cart', 'orders', 'shop', 'merchant'];

function commerceSubpackageRollup(name) {
  const input = `src/commerce/${name}/index.ts`;
  const plugins = [
    resolve({ browser: true, preferBuiltins: false }),
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
    {
      input,
      output: [{ file: `dist/commerce/${name}/index.d.ts`, format: 'esm' }],
      plugins: [dts()],
      external: [/\.css$/],
    },
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
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationMap: true
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
    input: 'src/commerce/assets/index.ts',
    output: [
      { file: 'dist/commerce/assets/index.js', format: 'cjs', sourcemap: true, inlineDynamicImports: true },
      { file: 'dist/commerce/assets/index.esm.js', format: 'esm', sourcemap: true, inlineDynamicImports: true },
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
  // Type definitions
  {
    input: 'src/index.ts',
    output: [{ file: 'dist/index.d.ts', format: 'esm' }],
    plugins: [dts()],
    external: [/\.css$/]
  },
  {
    input: 'src/capability-tasks/index.ts',
    output: [{ file: 'dist/capability-tasks/index.d.ts', format: 'esm' }],
    plugins: [dts()],
    external: [/\.css$/],
  },
  {
    input: 'src/manifest/index.ts',
    output: [{ file: 'dist/manifest/index.d.ts', format: 'esm' }],
    plugins: [dts()],
    external: [/\.css$/],
  },
  {
    input: 'src/economy/index.ts',
    output: [{ file: 'dist/economy/index.d.ts', format: 'esm' }],
    plugins: [dts()],
    external: [/\.css$/],
  },
  {
    input: 'src/finance/index.ts',
    output: [{ file: 'dist/finance/index.d.ts', format: 'esm' }],
    plugins: [dts()],
    external: [/\.css$/],
  },
  {
    input: 'src/guidance/index.ts',
    output: [{ file: 'dist/guidance/index.d.ts', format: 'esm' }],
    plugins: [dts()],
    external: [/\.css$/],
  },
  {
    input: 'src/commerce/assets/index.ts',
    output: [{ file: 'dist/commerce/assets/index.d.ts', format: 'esm' }],
    plugins: [dts()],
    external: [/\.css$/],
  },
  {
    input: 'src/commerce/marketplace/index.ts',
    output: [{ file: 'dist/commerce/marketplace/index.d.ts', format: 'esm' }],
    plugins: [dts()],
    external: [/\.css$/],
  },
  {
    input: 'src/commerce/index.ts',
    output: [{ file: 'dist/commerce/index.d.ts', format: 'esm' }],
    plugins: [dts()],
    external: [/\.css$/],
  },
  {
    input: 'src/pwa/index.ts',
    output: [{ file: 'dist/pwa/index.d.ts', format: 'esm' }],
    plugins: [dts()],
    external: [/\.css$/],
  },
  {
    input: 'src/mobile/index.ts',
    output: [{ file: 'dist/mobile/index.d.ts', format: 'esm' }],
    plugins: [dts()],
    external: [/\.css$/],
  },
  {
    input: 'src/logic/blueprints/index.ts',
    output: [{ file: 'dist/logic/blueprints/index.d.ts', format: 'esm' }],
    plugins: [dts()],
    external: [/\.css$/],
  },
];
