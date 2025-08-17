import { defineConfig } from '@hey-api/openapi-ts'

export default defineConfig({
  input: 'https://api.theporndb.net/specs?openapi.json',
  output: {
    path: 'src/generated/theporndb',
    format: 'prettier',
    lint: 'eslint'
  },
  plugins: [
    {
      name: '@hey-api/client-next',
      runtimeConfigPath: './src/lib/api/theporndb/api.ts'
    }
  ]
})
