import 'dotenv/config'

import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
  ignoreNoDocuments: true,
  generates: {
    'src/generated/stash/': {
      // @ts-expect-error - Apollo Engine schema options
      schema: [{ [`${process.env.STASH_BASE_URL ?? ''}/graphql`]: { headers: { ApiKey: process.env.STASH_API_KEY } } }],
      documents: ['src/lib/api/stash/**/*.ts'],
      preset: 'client',
      config: { documentMode: 'string' }
    },
    'src/generated/stashdb/': {
      schema: [{ ['https://stashdb.org/graphql']: { headers: { ApiKey: process.env.STASHDB_API_KEY ?? '' } } }],
      documents: ['src/lib/api/stashdb/**/*.ts'],
      preset: 'client',
      config: { documentMode: 'string' }
    }
  },
  hooks: {
    afterAllFileWrite: ['eslint --fix', 'prettier --write']
  }
}

export default config
