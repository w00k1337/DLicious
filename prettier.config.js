// @ts-check

/**
 * @see https://prettier.io/docs/en/configuration.html
 * @type {import("prettier").Config}
 */
const config = {
  arrowParens: 'avoid',
  plugins: ['prettier-plugin-tailwindcss'],
  printWidth: 120,
  semi: false,
  singleQuote: true,
  tailwindStylesheet: './src/app/globals.css',
  trailingComma: 'none'
}

export default config
