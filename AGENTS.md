# AGENTS.md. DLicious

_Last updated 2025-08-10_

> **purpose** – This file is the onboarding manual for every AI assistant (Claude, Cursor, GPT, etc.) and every human who edits this repository.  
> It encodes our coding standards, guard-rails, and workflow tricks so the _human 30 %_ (architecture, tests, domain judgment) stays in human hands.[^1]

---

## 0. Project overview

DLicious is a performer-centric automation web app for adult content discovery and downloading. It bridges the gap between content management systems (Stash) and download automation tools by focusing on individual performers rather than sites.

Key components:

- **src/app**: Next.js App Router pages and API routes
- **src/components**: Reusable React components
- **src/env/server.ts**: Typed environment variables with Zod validation
- **src/lib/api**: External API integrations (Stash, StashDB, ThePornDB, SABnzbd)
- **src/lib/queue**: Background job processing with BullMQ and Redis
- **src/lib/prisma.ts**: Prisma client instance
- **prisma/schema.prisma**: Prisma database schema

**Golden rule**: When unsure about implementation details or requirements, ALWAYS consult the developer rather than making assumptions.

---

## 1. Non-negotiable golden rules

| #:  | AI _may_ do                                                                                                                                                                                      | AI _must NOT_ do                                                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| G-0 | Whenever unsure about something that's related to the project, ask the developer for clarification before making changes.                                                                        | ❌ Write changes or use tools when you are not sure about something project specific, or if you don't have context for a particular feature/decision. |
| G-1 | Generate code **only inside** relevant source directories (e.g., `src/app/` for pages, `src/components/` for React components, `src/lib/api/` for API integrations) or explicitly pointed files. | ❌ Touch `__tests__/`, `*.test.ts`, `*.spec.ts` files (humans own tests & specs).                                                                     |
| G-2 | Add/update **`AIDEV-NOTE:` anchor comments** near non-trivial edited code.                                                                                                                       | ❌ Delete or mangle existing `AIDEV-` comments.                                                                                                       |
| G-3 | Follow lint/style configs (`eslint.config.js`, `prettier.config.js`, `commitlint.config.ts`). Use the project's configured linter, if available, instead of manually re-formatting code.         | ❌ Re-format code to any other style.                                                                                                                 |
| G-4 | For changes >300 LOC or >3 files, **ask for confirmation**.                                                                                                                                      | ❌ Refactor large modules without human guidance.                                                                                                     |
| G-5 | Stay within the current task context. Inform the dev if it'd be better to start afresh.                                                                                                          | ❌ Continue work from a prior prompt after "new task" – start a fresh session.                                                                        |

---

## 2. Build, test & utility commands

Use `pnpm` commands for consistency (they ensure correct environment variables and configuration).

```bash
# Development
pnpm dev              # Start dev server with HTTPS and pretty logs
pnpm build            # Build for production
pnpm start            # Start production server

# Code Quality
pnpm lint:js          # Run ESLint with max 0 warnings
pnpm prettier:check   # Check code formatting
pnpm prettier:fix     # Fix code formatting
pnpm typecheck        # Run tsc

# Testing
pnpm test             # Run Vitest tests

# Code Generation
pnpm exec graphql-codegen    # Generate GraphQL types
pnpm exec prisma generate    # Generate Prisma client
pnpm exec prisma migrate dev # Run database migrations
```

For simple, quick TypeScript script tests: `pnpm exec tsx src/test-file.ts` (ensure correct CWD).

---

## 3. Coding standards

- **TypeScript**: 5.0+, Next.js 15, `async/await` preferred, strict mode.
- **Formatting**: Prettier enforces consistent formatting, ESLint for code quality.
- **Typing**: Strict TypeScript with Zod schemas for validation.
- **Functions**: Arrow functions except in classes. All functions must have explicit return types.
- **Naming**: `camelCase` (functions/variables), `PascalCase` (classes/components), `SCREAMING_SNAKE` (constants).
- **Error Handling**: Typed exceptions in `src/lib/errors/`, React error boundaries.
- **Documentation**: JSDoc for public functions/classes.
- **Testing**: Vitest for unit and integration tests.
- **UI**: Use shadcn/ui components from `src/components/ui/`.
- **Date/Time**: Use dayjs for all date operations, ms library for durations.
- **Security**: Never log/commit secrets, use env vars only.

**Key patterns**:

- **Functions**: Arrow functions with explicit return types, async/await over Promises
- **Errors**: Fail fast, custom error types, consistent API error formats
- **Components**: Accessibility required, dark mode support, loading/error states

Example:

```typescript
import { ValidationError } from '@/lib/errors'
import dayjs from 'dayjs'
import ms from 'ms'

const processData = async (data: Record<string, any>): Promise<Result> => {
  try {
    // Process data
    return result
  } catch (error) {
    if (error instanceof KeyError) {
      throw new ValidationError(`Missing required field: ${error.message}`)
    }
    throw error
  }
}

// Date/Time example
const formatLastSync = (date: Date): string => {
  const now = dayjs()
  const syncDate = dayjs(date)
  if (syncDate.isAfter(now.subtract(1, 'day'))) {
    return `Last synced ${syncDate.fromNow()} ago`
  }
  return `Last synced on ${syncDate.format('MMMM D, YYYY')}`
}
```

---

## 4. Project layout & Core Components

| Directory            | Description                                      |
| -------------------- | ------------------------------------------------ |
| `src/app/`           | Next.js App Router pages and API routes          |
| `src/components/`    | Reusable React components (shadcn/ui components) |
| `src/components/ui/` | shadcn/ui component library                      |
| `src/env/`           | Typed environment variables with Zod validation  |
| `src/lib/api/`       | External API integrations (Stash, StashDB, etc.) |
| `src/lib/queue/`     | Background job processing with BullMQ and Redis  |
| `src/generated/`     | Auto-generated code (Prisma, GraphQL)            |
| `prisma/`            | Database schema and migrations                   |

**Key domain models**: Performer (actors tracked for discovery), Scene (content with metadata)

**Ignore files**: `.agentignore` and `.agentindexignore` control AI tool file access - never modify without permission.

---

## 5. Anchor comments

Add specially formatted comments throughout the codebase, where appropriate, for yourself as inline knowledge that can be easily `grep`ped for.

### Guidelines:

- Use `AIDEV-NOTE:`, `AIDEV-TODO:`, or `AIDEV-QUESTION:` (all-caps prefix) for comments aimed at AI and developers.
- Keep them concise (≤ 120 chars).
- **Important:** Before scanning files, always first try to **locate existing anchors** `AIDEV-*` in relevant subdirectories.
- **Update relevant anchors** when modifying associated code.
- **Do not remove `AIDEV-NOTE`s** without explicit human instruction.
- Make sure to add relevant anchor comments, whenever a file or piece of code is:
  - too long, or
  - too complex, or
  - very important, or
  - confusing, or
  - could have a bug unrelated to the task you are currently working on.

Example:

```typescript
// AIDEV-NOTE: perf-hot-path; avoid extra allocations in queue processing
const processQueueItem = async (...args): Promise<void> => { ... }
```

---

## 6. Commit discipline

- **Granular commits**: One logical change per commit.
- **Tag AI-generated commits**: e.g., `feat: add performer monitoring [AI]`.
- **Clear commit messages**: Explain the _why_; link to issues/ADRs if architectural.
- **Use `git worktree`** for parallel/long-running AI branches (e.g., `git worktree add ../wip-foo -b wip-foo`).
- **Review AI-generated code**: Never merge code you don't understand.

---

## 7. API models & codegen

- To modify API models (e.g., in `src/generated/`), **edit GraphQL schemas** or **Prisma schema**.
- **Regenerate code** after schema changes: `pnpm exec graphql-codegen` or `pnpm exec prisma generate`.
- **Do NOT manually edit** generated files (e.g., in `src/generated/` directories) as they will be overwritten.

**API pattern examples**:

```typescript
// Route definition
export const POST = async (request: NextRequest): Promise<NextResponse<Result>> => {
  try {
    const body = await request.json()
    const validatedData = performerSchema.parse(body)

    // Implementation...
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
```

---

## 8. External API integrations

See implementations in `src/lib/api/`:

- **Stash/StashDB**: GraphQL APIs for performer/scene data
- **ThePornDB**: Scene metadata and availability
- **Hydra2**: Usenet content search
- **Sabnzbd**: NZB download client

---

## 9. Background job processing

BullMQ with Redis. See `src/lib/queue/jobs/` for job definitions, `src/instrumentation.ts` for worker registration.
Jobs must implement retry logic and dead letter queues. Use typed data with Zod validation.

---

## 10. Directory-Specific AGENTS.md Files

- **Always check for `AGENTS.md` files in specific directories** before working on code within them. These files contain targeted context.
- If a directory's `AGENTS.md` is outdated or incorrect, **update it**.
- If you make significant changes to a directory's structure, patterns, or critical implementation details, **document these in its `AGENTS.md`**.
- If a directory lacks a `AGENTS.md` but contains complex logic or patterns worth documenting for AI/humans, **suggest creating one**.

---

## 11. Database patterns

- **Prisma ORM**: Type-safe database access, client at `src/lib/prisma.ts`
- **Generated client**: Output to `src/generated/prisma/`
- **Migrations**: `pnpm exec prisma migrate dev`
- **Transactions**: Use `prisma.$transaction()` for multi-table writes
- **Schema**: See `prisma/schema.prisma` for models and enums

---

## 12. Common pitfalls

- Mixing test frameworks (use Vitest, not Jest syntax).
- Forgetting to run `pnpm exec prisma generate` after schema changes.
- Wrong current working directory (CWD) for commands/tests.
- Large AI refactors in a single commit (makes `git bisect` difficult).
- Delegating test/spec writing entirely to AI (can lead to false confidence).
- **Note about generated code**: Always regenerate after schema changes, never edit generated files directly.
- Using native JavaScript Date methods instead of dayjs functions for date/time operations.
- Manually parsing time strings or calculating millisecond durations instead of using the "ms" library.

---

## 13. Versioning conventions

Components are versioned independently. Semantic Versioning (SemVer: `MAJOR.MINOR.PATCH`) is generally followed, as specified in `package.json`.

- **MAJOR** version update: For incompatible API changes.
- **MINOR** version update: For adding functionality in a backward-compatible manner.
- **PATCH** version update: For backward-compatible bug fixes.

---

## 14. Key File & Pattern References

This section provides pointers to important files and common patterns within the codebase.

- **API Route Definitions**:
  - Location: `src/app/api/` (e.g., `src/app/api/performers/route.ts`)
  - Pattern: Next.js App Router API routes, Zod validation, typed responses.
- **React Components**:
  - Location: `src/components/` and `src/app/`
  - Pattern: Functional components with TypeScript, proper error boundaries.
  - **UI Components**: Use shadcn/ui components from `src/components/ui/` for consistent design
- **Database Models**:
  - Location: `prisma/schema.prisma`
  - Pattern: Prisma schema with custom enums and relationships.
- **Background Jobs**:
  - Location: `src/lib/queue/jobs/`
  - Pattern: BullMQ job definitions with typed data and error handling.
- **External API Integrations**:
  - Location: `src/lib/api/`
  - Pattern: GraphQL clients, REST API wrappers with proper error handling.

---

## 15. Domain-Specific Terminology

- **Performer**: An individual actor/actress tracked for content discovery and automation
- **Scene**: Individual content piece with metadata from various sources
- **Queue**: Background job processing system using BullMQ and Redis
- **Stash**: Primary content management system for performer and scene data
- **Hydra2**: Usenet search engine for content discovery
- **Sabnzbd**: Download client for NZB files
- **ThePornDB/StashDB**: External APIs for scene metadata and availability
- **AIDEV-NOTE/TODO/QUESTION**: Specially formatted comments to provide inline context or tasks for AI assistants and developers
- **shadcn/ui**: Component library built on Radix UI primitives and Tailwind CSS for consistent, accessible UI components
- **dayjs**: Date utility library for consistent date/time operations, formatting, and calculations throughout the application
- **ms**: Millisecond utility library for parsing and formatting human-readable time durations

[^1]: This principle emphasizes human oversight for critical aspects like architecture, testing, and domain-specific decisions, ensuring AI assists rather than fully dictates development.
