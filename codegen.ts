import 'dotenv/config'

import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
  generates: {
    'src/generated/stash/': {
      schema: {
        [`${process.env.STASH_BASE_URL ?? ''}/graphql`]: {
          headers: {
            ApiKey: process.env.STASH_API_KEY ?? ''
          }
        }
      },
      documents: ['src/**/*.stash.graphql.ts', 'src/lib/api/stash/**/*.ts'],
      preset: 'client'
    },
    'src/generated/stashdb/': {
      schema: {
        'https://stashdb.org/graphql': {
          headers: {
            ApiKey: process.env.STASHDB_API_KEY ?? ''
          }
        }
      },
      documents: ['src/**/*.stashdb.graphql.ts', 'src/lib/api/stashdb/**/*.ts'],
      preset: 'client'
    }
  },
  hooks: {
    afterAllFileWrite: ['eslint --fix', 'prettier --write']
  },
  ignoreNoDocuments: true
}

export default config
