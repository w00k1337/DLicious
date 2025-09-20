# Repository Guidelines

> **📖 For comprehensive project documentation, development philosophy, and detailed guidelines, see [CLAUDE.md](./CLAUDE.md)**

## Project Structure & Module Organization

- `src/app`: Next.js App Router (routes, layouts, API routes), global styles in `src/app/globals.css`.
- `src/components`: Reusable UI components. Mark client files with `"use client"`.
- `src/lib`: Core libraries — API clients (`stash`, `stashdb`, `theporndb`), `queue` (BullMQ), `prisma`, `logger`.
- `src/generated/**`: Auto-generated types/clients (GraphQL/OpenAPI/Prisma). Do not edit.
- `src/env/server.ts`: Environment validation (Zod).
- `prisma/`: Prisma schema and assets. `public/`: static assets.

## Build, Test, and Development Commands

- Install: `pnpm install`
- Dev (HTTPS, pretty logs): `pnpm dev`
- Build/Start: `pnpm build` ; `pnpm start`
- Typecheck: `pnpm typecheck`
- Lint: `pnpm lint` (ESLint, zero warnings)
- Format: `pnpm prettier:check` | `pnpm prettier:fix`
- Tests (Vitest): `pnpm test` | single file: `vitest --run path/to/file.test.ts` | by name: `vitest --run -t "test name"`
- Codegen: `pnpm codegen` (or `pnpm graphql-codegen`, `pnpm openapi-ts`)
- Prisma: `pnpm prisma generate` | `pnpm prisma migrate dev` | `pnpm prisma studio`

## Coding Style & Naming Conventions

- ESLint + Prettier. Prettier: `printWidth 120`, `singleQuote`, `semi: false`, `trailingComma: none`, `arrowParens: avoid`; Tailwind classes auto-sorted via `prettier-plugin-tailwindcss` using `src/app/globals.css`.
- Imports: enforce `import/first`, `newline-after-import`, `no-duplicates`; sort with `simple-import-sort`.
- Functions: prefer arrow functions; require explicit return types.
- Types: strict TypeScript; define dedicated interfaces/types; validate external data with Zod and infer TS types.
- Naming: `camelCase` variables/functions, `PascalCase` types/components, `UPPER_SNAKE_CASE` constants; export queue names as constants.
- Errors & logging: use functional patterns (Result/typed errors); log with Pino (`src/lib/logger.ts`). Avoid swallowing errors.
- Async: avoid sequential awaits; use `Promise.all/settled` when independent.

## Testing Guidelines

- Framework: Vitest (+ Testing Library for React as needed).
- Location/naming: co-locate tests with modules; use `*.test.ts`/`*.test.tsx`.
- Expectations: keep tests deterministic; validate schemas with Zod where applicable.

## Commit & Pull Request Guidelines

- Commits: Conventional Commits (commitlint). Examples: `feat: add queue metrics`, `fix: handle stashdb error`, `chore: update deps`.
- PRs: clear description, linked issues, steps to test, and screenshots for UI changes. All checks must pass; no lint warnings; exclude changes to `src/generated/**`.
