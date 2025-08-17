# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DLicious is a Next.js application for discovering and tracking adult content from performers. It integrates with Stash (self-hosted media server) and StashDB APIs to manage performer data and scene information.

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript 5.9
- **Database**: PostgreSQL with Prisma ORM
- **Queue System**: BullMQ with Redis
- **Styling**: Tailwind CSS v4 with shadcn/ui components
- **Package Manager**: pnpm (required: >=10.11.0)
- **Node Version**: >=20

## Development Commands

```bash
# Install dependencies
pnpm install

# Run development server with HTTPS
pnpm dev

# Build application
pnpm build

# Start production server
pnpm start

# Type checking
pnpm typecheck

# Linting
pnpm lint:js

# Formatting
pnpm prettier:check
pnpm prettier:fix

# Testing
pnpm test                    # Run all tests
vitest watch                 # Run tests in watch mode
vitest --run path/to/test    # Run specific test file

# Database operations
pnpm prisma generate         # Generate Prisma client
pnpm prisma migrate dev      # Run migrations in development
pnpm prisma studio           # Open Prisma Studio GUI

# GraphQL code generation
pnpm graphql-codegen         # Generate TypeScript types from GraphQL schemas
```

## Architecture

### Core Structure

The application follows Next.js App Router conventions with server components as default:

- **`/src/app`**: App router pages and API routes
- **`/src/components`**: Reusable UI components (mostly shadcn/ui)
- **`/src/lib`**: Core business logic and utilities
  - `/api/stash`: Stash API integration with GraphQL
  - `/api/stashdb`: StashDB API integration with GraphQL
  - `/queue`: BullMQ job processing system
- **`/src/generated`**: Auto-generated code (Prisma client, GraphQL types)

### Database Schema

The application uses Prisma with PostgreSQL. Key models:

- **Performer**: Adult performers with Stash integration
- **Scene**: Individual scenes/videos linked to performers
- **Studio**: Production studios
- **Hash**: File hashes for scene identification

### API Integration

The app integrates with two external GraphQL APIs:

1. **Stash API** (`STASH_BASE_URL`): Local media server
2. **StashDB API**: Community database

Both APIs use generated TypeScript types from GraphQL schemas located in `/src/generated/`.

### Environment Configuration

Required environment variables (see `.env.example`):

- `DATABASE_URL`: PostgreSQL connection string
- `DIRECT_URL`: Direct database connection (for migrations)
- `REDIS_HOST/PORT/PASSWORD`: Redis connection for BullMQ
- `STASH_BASE_URL/API_KEY`: Stash server credentials
- `STASHDB_API_KEY`: StashDB API key

Environment validation is handled by `@t3-oss/env-nextjs` in `/src/env/server.ts`.

### Code Generation

The project uses automated code generation:

- **Prisma Client**: Generated to `/src/generated/prisma/`
- **GraphQL Types**: Generated via `codegen.ts` configuration

### Testing Strategy

- **Framework**: Vitest with React Testing Library
- **Configuration**: `vitest.config.ts`
- Tests run automatically on pre-commit via Husky

### Code Quality

Pre-commit hooks via Husky and lint-staged ensure:

1. ESLint validation (max warnings: 0)
2. Prettier formatting
3. Test execution
4. Commit message linting (conventional commits)

## Important Patterns

### Server Components by Default

All components are server components unless explicitly marked with `"use client"`. Data fetching happens directly in components using async/await.

### Type Safety

- Strict TypeScript configuration
- Generated types for Prisma models and GraphQL queries
- Zod validation for environment variables

### Logging

Uses Pino logger configured in `/src/lib/logger.ts`. In development, logs are prettified with `pino-pretty`.
