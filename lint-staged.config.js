// @ts-check

const config = {
  '**/*.ts?(x)': ['eslint --max-warnings 0 --fix --no-warn-ignored', 'prettier --write'],
  '**/*.{js,mjs,cjs}': ['eslint --max-warnings 0 --fix --no-warn-ignored', 'prettier --write'],
  '!(*.css|*.ts?(x)|*.{js,mjs,cjs})': 'prettier --write --ignore-unknown'
}

export default config
