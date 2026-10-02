// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

// Packages that must never appear outside their allowed zones
const PLATFORM = ['electron', 'electron/*'];
const REACT = ['react', 'react/*', 'react-dom', 'react-dom/*'];

// All @progresscut workspace packages
const ALL_PACKAGES = [
  '@progresscut/domain*',
  '@progresscut/engine*',
  '@progresscut/capture*',
  '@progresscut/render*',
];

function noImport(patterns) {
  return {
    'no-restricted-imports': [
      'error',
      {
        patterns: patterns.map((group) => (typeof group === 'string' ? { group: [group] } : group)),
      },
    ],
  };
}

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strict,

  // ── Global rules ──────────────────────────────────────────────────────────
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'max-lines': ['error', { max: 200, skipBlankLines: false, skipComments: false }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },

  // ── domain: pure types — no external deps, no other @progresscut packages ──
  {
    files: ['packages/domain/src/**'],
    rules: noImport([
      ...ALL_PACKAGES.map((g) => ({
        group: [g],
        message: 'domain must not import other @progresscut packages',
      })),
      {
        group: [...PLATFORM, ...REACT, 'sharp*', 'zod*', 'electron*'],
        message: 'domain has no external runtime deps',
      },
    ]),
  },

  // ── engine: domain only — no infrastructure ────────────────────────────────
  {
    files: ['packages/engine/src/**'],
    rules: noImport([
      {
        group: ['@progresscut/capture*', '@progresscut/render*'],
        message: 'engine must not import infrastructure packages; only @progresscut/domain is allowed',
      },
      { group: [...PLATFORM, ...REACT], message: 'engine must not import platform deps' },
    ]),
  },

  // ── capture / render: domain only, no cross-adapter imports ───────────────
  {
    files: ['packages/capture/src/**', 'packages/render/src/**'],
    rules: noImport([
      {
        group: ['@progresscut/engine*'],
        message: 'adapters must not import engine',
      },
      { group: [...PLATFORM], message: 'use MacosCaptureProvider in apps/desktop only' },
      { group: [...REACT], message: 'react is not allowed in adapter packages' },
    ]),
  },

  // ── apps/desktop main: electron is allowed here only ──────────────────────
  {
    files: ['apps/desktop/src/main/**', 'apps/desktop/src/preload/**'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },

  // ── apps/desktop renderer: no direct electron — use contextBridge API ─────
  {
    files: ['apps/desktop/src/renderer/**'],
    rules: noImport([
      {
        group: [...PLATFORM],
        message: 'renderer must not import electron directly; use contextBridge API',
      },
    ]),
  },

  {
    ignores: ['dist/', '**/dist/', 'node_modules/'],
  },
);
