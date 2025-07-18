// @ts-check

import eslint from '@eslint/js'
import next from '@next/eslint-plugin-next'
import * as pluginImport from 'eslint-plugin-import'
import preferArrowFunctions from 'eslint-plugin-prefer-arrow-functions'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['.next/**', 'node_modules/**', 'src/generated/**'] },
  eslint.configs.recommended,
  {
    plugins: {
      '@next/next': next
    },
    // @ts-expect-error - next.configs.recommended.rules is not typed
    rules: {
      ...next.configs.recommended.rules,
      ...next.configs['core-web-vitals'].rules
    }
  },
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    }
  },
  {
    files: ['**/*.mjs', '**/*.cjs', '**/*.js'],
    ...tseslint.configs.disableTypeChecked
  },
  {
    plugins: {
      import: pluginImport,
      'simple-import-sort': simpleImportSort
    },
    rules: {
      'import/first': 'error',
      'import/newline-after-import': 'error',
      'import/no-duplicates': 'error',
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error'
    }
  },
  {
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'error'
    }
  },
  {
    plugins: {
      'prefer-arrow-functions': preferArrowFunctions
    },
    rules: {
      'prefer-arrow-functions/prefer-arrow-functions': 'error'
    }
  }
)
