import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

const productionTypeScriptFiles = ['src/**/*.{ts,tsx}', 'server/src/**/*.ts']

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@prisma/client',
              message: 'Import Prisma types through src/types/prisma.ts',
            },
          ],
        },
      ],
    },
  },
  {
    files: productionTypeScriptFiles,
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-ignore': false,
          'ts-nocheck': false,
          'ts-check': true,
          minimumDescriptionLength: 10,
        },
      ],
    },
  },
  {
    files: ['src/types/prisma.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
])
