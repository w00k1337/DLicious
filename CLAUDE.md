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
  - `/api/theporndb`: ThePornDB API integration (REST)
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

### Queue System (BullMQ)

The application uses BullMQ with Redis for background job processing. **Always make use of BullMQ generics for type safety:**

- **Jobs**: Use custom types for job data instead of `any`
- **Queues**: Leverage generics to ensure type-safe job creation and processing
- **Workers**: Implement strongly-typed workers that match job data types

Example pattern:

```typescript
// Define job data type
interface SceneImportJobData {
  sceneId: string
  performerIds: string[]
}

// Define job result type
interface SceneImportJobResult {
  importedScenes: number
}

// Export queue name for reuse across workers and other components
export const SCENE_IMPORT_QUEUE_NAME = 'scene-import'

// Use generics in queue and worker
const queue = new Queue<SceneImportJobData, SceneImportJobResult>(SCENE_IMPORT_QUEUE_NAME)
const worker = new Worker<SceneImportJobData, SceneImportJobResult>(SCENE_IMPORT_QUEUE_NAME, processor)
```

This ensures compile-time type checking and better developer experience when working with job data and results. **Always export queue names as constants** so they can be referenced consistently across workers, job creators, and other components that need to interact with the same queue.

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

### Functional Programming

**Prefer functional programming concepts over imperative ones:**

- **Use `map`, `filter`, `reduce`** instead of `for` loops and `while` loops
- **Avoid `forEach`** - use `map` for transformations, `reduce` for side effects, or `for...of` if imperative logic is needed
- **Favor immutable operations** and avoid mutating existing data
- **Use array methods** like `find`, `some`, `every` for conditional logic
- **Leverage method chaining** for cleaner, more readable code

Example:

```typescript
// ✅ Good - functional approach
const activePerformers = performers
  .filter(performer => performer.isActive)
  .map(performer => ({
    ...performer,
    sceneCount: performer.scenes.length
  }))
  .sort((a, b) => b.sceneCount - a.sceneCount)

// ❌ Avoid - imperative approach
const activePerformers = []
for (let i = 0; i < performers.length; i++) {
  if (performers[i].isActive) {
    const performer = { ...performers[i] }
    performer.sceneCount = performer.scenes.length
    activePerformers.push(performer)
  }
}
activePerformers.sort((a, b) => b.sceneCount - a.sceneCount)
```

This leads to more declarative, testable, and maintainable code.

### Async/Await Best Practices

**Avoid sequential awaits when possible - use Promise.all or Promise.allSettled:**

- **Use `Promise.all`** when all promises must succeed
- **Use `Promise.allSettled`** when you want to handle both successes and failures
- **Avoid sequential awaits** that don't depend on each other
- **Improve performance** by running independent operations in parallel

Example:

```typescript
// ✅ Good - parallel execution
const [performers, scenes, studios] = await Promise.all([fetchPerformers(), fetchScenes(), fetchStudios()])

// ✅ Good - handling mixed results
const results = await Promise.allSettled([updatePerformer(id1), updatePerformer(id2), updatePerformer(id3)])

const successful = results
  .filter((result): result is PromiseFulfilledResult<Performer> => result.status === 'fulfilled')
  .map(result => result.value)

// ❌ Avoid - sequential awaits
const performers = await fetchPerformers()
const scenes = await fetchScenes()
const studios = await fetchStudios()
```

This improves performance and makes async operations more efficient.

## Important Patterns

### Golden Rule: Consult, Don't Assume

**When unsure about implementation details or requirements, ALWAYS consult the developer rather than making assumptions.** This is the most important rule - it's better to ask for clarification than to implement something incorrectly.

### Early Development Phase

**We are in early development - prioritize clean architecture over backward compatibility:**

- **Refactor freely** without worrying about breaking existing code or APIs
- **No legacy code constraints** - we can rewrite and improve as needed
- **Focus on getting the architecture right** rather than maintaining compatibility
- **Don't hesitate to change interfaces, schemas, or patterns** if a better approach emerges
- **Experiment and iterate** - we can always refactor later

### Simplicity First

**Always prefer the simplest solution that works.** Don't overengineer - we can build upon the foundation later. Less code is better. Start with the most straightforward approach and only add complexity when it's absolutely necessary.

### File Size Guidelines

**If a file has more than 300 lines of code, refactor it.** Large files are harder to maintain, understand, and test. Break them down into smaller, focused modules with clear responsibilities.

### Library Documentation

**Always look up the official documentation when dealing with libraries or packages.** Use Context7 as an MCP server for the lookup to ensure you're using the most up-to-date and accurate information from the source.

### Time and Duration Handling

When working with milliseconds (e.g., sleep, timeouts, delays), use the "ms" library to make code more readable:

```typescript
// ✅ Good - readable and self-documenting
const delay = ms('3s')
const timeout = ms('5m')
const interval = ms('1h')

// ❌ Avoid - magic numbers
const delay = 3000
const timeout = 300000
const interval = 3600000
```

### Date Handling

**Use dayjs for all date operations and arithmetic:**

```typescript
import dayjs from 'dayjs'

// ✅ Good - using dayjs
const today = dayjs()
const nextWeek = dayjs().add(1, 'week')
const age = dayjs().diff(dayjs(birthDate), 'year')
const isExpired = dayjs(expiryDate).isBefore(dayjs())

// ❌ Avoid - native Date or manual calculations
const today = new Date()
const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
```

dayjs provides a clean, immutable API for date manipulation and is much more readable than native Date operations.

### Server Components by Default

All components are server components unless explicitly marked with `"use client"`. Data fetching happens directly in components using async/await.

### Type Safety

- Strict TypeScript configuration
- Generated types for Prisma models and GraphQL queries
- Zod validation for environment variables

### Dedicated Types and Interfaces

**Create dedicated interfaces and types instead of using inline types:**

- **Define explicit interfaces** for function parameters, return types, and object structures
- **Avoid inline object types** in function signatures and variable declarations
- **Use descriptive names** that clearly indicate the purpose and structure
- **Group related types** in dedicated type files or modules

Example:

```typescript
// ✅ Good - dedicated interfaces
interface PerformerData {
  id: string
  name: string
  birthDate: Date
  height?: number
  isActive: boolean
}

interface ValidationResult {
  isValid: boolean
  errors: string[]
}

const validatePerformer = (data: PerformerData): ValidationResult => {
  // validation logic
}

// ❌ Avoid - inline types
const validatePerformer = (data: {
  id: string
  name: string
  birthDate: Date
  height?: number
  isActive: boolean
}): { isValid: boolean; errors: string[] } => {
  // validation logic
}
```

This improves code readability, reusability, and maintainability.

### Object Destructuring

**Always destructure objects instead of accessing properties directly:**

- **Destructure function parameters** to access specific properties
- **Use destructuring in variable assignments** for cleaner code
- **Leverage default values** and rest parameters when appropriate
- **Improve readability** by making property access explicit

Example:

```typescript
// ✅ Good - destructuring
const processPerformer = ({ id, name, birthDate, height }: PerformerData) => {
  return { performerId: id, displayName: name, age: calculateAge(birthDate) }
}

const { isValid, errors } = validatePerformer(performerData)
const { name, ...otherProps } = performerData

// ❌ Avoid - direct property access
const processPerformer = (performer: PerformerData) => {
  return {
    performerId: performer.id,
    displayName: performer.name,
    age: calculateAge(performer.birthDate)
  }
}

const result = validatePerformer(performerData)
if (result.isValid) {
  // handle success
}
```

This makes code more concise and explicit about which properties are being used.

### Zod Schemas for Runtime Validation

**Use Zod schemas for runtime validation and data transformation:**

- **Validate external data** (API responses, user input, database results)
- **Transform data** during validation (e.g., parsing strings to dates, normalizing values)
- **Infer TypeScript types** from schemas instead of manually defining them
- **Handle errors gracefully** with detailed validation messages

Example:

```typescript
import { z } from 'zod'

// Define schema with transformations
const PerformerSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required'),
  birthDate: z.string().transform(val => new Date(val)),
  height: z.number().optional(),
  isActive: z.boolean().default(true)
})

// Infer type from schema
type Performer = z.infer<typeof PerformerSchema>

// Validate and transform data
const validatePerformer = (data: unknown): Performer => {
  return PerformerSchema.parse(data)
}

// Safe parsing with error handling
const safeValidatePerformer = (data: unknown) => {
  return PerformerSchema.safeParse(data)
}
```

This ensures data integrity and provides type safety at runtime.

### Logging

Uses Pino logger configured in `/src/lib/logger.ts`. In development, logs are prettified with `pino-pretty`.
