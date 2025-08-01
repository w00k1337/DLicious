# AGENTS.md. DLicious

_Last updated 2025-08-01_

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
pnpm lint             # Run Next.js linter
pnpm lint:js          # Run ESLint with max 0 warnings
pnpm prettier:check   # Check code formatting
pnpm prettier:fix     # Fix code formatting

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

- **TypeScript**: 5.0+, Next.js 15, `async/await` preferred.
- **Formatting**: Prettier enforces consistent formatting, ESLint for code quality.
- **Typing**: Strict TypeScript with Zod schemas for validation.
- **Functions**: Always use arrow functions except in classes. All functions must have explicit return types.
- **Naming**: `camelCase` (functions/variables), `PascalCase` (classes/components), `SCREAMING_SNAKE` (global / exported constants).
- **Error Handling**: Typed exceptions; proper error boundaries for React components.
- **Documentation**: JSDoc comments for public functions/classes.
- **Testing**: Vitest for unit and integration tests.
- **UI Components**: Use shadcn/ui components wherever possible for consistent design and functionality.
- **Date/Time Handling**: Always use date-fns for date and time operations, formatting, and calculations.
- **Millisecond Handling**: Use the "ms" library for parsing and formatting millisecond durations.

**Date/Time patterns**:

- **date-fns**: Use date-fns for all date/time operations, formatting, and calculations
- **Import specific functions**: Import only the functions you need (e.g., `import { format, formatDistanceToNow } from 'date-fns'`)
- **Consistent formatting**: Use date-fns formatting functions for user-facing date displays
- **Timezone handling**: Use date-fns timezone functions when timezone conversion is needed
- **Date calculations**: Use date-fns for date arithmetic, comparisons, and relative time calculations
- **Avoid native Date methods**: Prefer date-fns functions over native JavaScript Date methods for consistency and reliability
- **Millisecond parsing**: Use the "ms" library for parsing human-readable time strings to milliseconds
- **Millisecond formatting**: Use the "ms" library for converting milliseconds to human-readable time strings

**Function patterns**:

- **Arrow functions**: Always use arrow functions except in classes
- **Explicit return types**: All functions must have explicit return types
- **Async/await**: Prefer async/await over Promise chains
- **Type safety**: Use strict TypeScript with proper type annotations

**Error handling patterns**:

- **Fail fast**: Handle invalid states immediately with meaningful error messages
- **Custom error types**: Create domain-specific errors in `src/lib/errors/`
- **React boundaries**: Implement Error Boundaries for component tree protection
- **API consistency**: Return consistent error formats with proper HTTP status codes
- **Async safety**: Use try-catch with async/await, handle Promise rejections explicitly
- **Recovery**: Implement retry mechanisms for transient failures, graceful degradation

**UI component patterns**:

- **shadcn/ui**: Use shadcn/ui components as the primary UI library for all new components
- **Component composition**: Prefer composition over inheritance, use compound components where appropriate
- **Accessibility**: All components must be accessible (ARIA labels, keyboard navigation, screen reader support)
- **Responsive design**: Components should work across all screen sizes
- **Dark mode**: Support both light and dark themes using CSS variables
- **Consistent styling**: Use Tailwind CSS classes and shadcn/ui design tokens
- **Loading states**: Implement proper loading states for async operations
- **Error states**: Show meaningful error messages with recovery options

Example:

```typescript
import { ValidationError } from '@/lib/errors'
import { format, formatDistanceToNow, isAfter, addDays } from 'date-fns'
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
  const now = new Date()
  if (isAfter(date, addDays(now, -1))) {
    return `Last synced ${formatDistanceToNow(date)} ago`
  }
  return `Last synced on ${format(date, 'PPP')}`
}

// Millisecond handling example
const parseTimeout = (timeout: string): number => {
  return ms(timeout) // Converts "5m", "2h", "1d" to milliseconds
}

const formatDuration = (milliseconds: number): string => {
  return ms(milliseconds, { long: true }) // Converts milliseconds to "5 minutes", "2 hours", etc.
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

**Key domain models**:

- **Performer**: Individual performers tracked for content discovery
- **Scene**: Individual content pieces with metadata

**shadcn/ui Setup**:

- **Installation**: shadcn/ui is configured with Tailwind CSS and Radix UI primitives
- **Component location**: All shadcn/ui components are in `src/components/ui/`
- **Adding components**: Use `npx shadcn@latest add [component-name]` to add new components
- **Customization**: Modify `src/components/ui/` components directly for project-specific styling
- **Theming**: Use CSS variables for consistent theming across light and dark modes
- **Icons**: Use Lucide React icons (included with shadcn/ui) for consistent iconography

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
const processQueueItem = async (...args): Promise<void> => {
  ...
}
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
export const POST = async (request: NextRequest): Promise<NextResponse> => {
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

- **Stash GraphQL API**: Primary data source for performers and scenes
- **ThePornDB API**: Scene metadata and availability lookup
- **StashDB GraphQL API**: Additional scene metadata and availability
- **Hydra2 API**: Usenet content search
- **Sabnzbd API**: Download client for NZB files

---

## 9. Background job processing

- **BullMQ**: Redis-based job queue for background processing
- **Job definitions**: Located in `src/lib/queue/jobs/`
- **Worker registration**: In `src/instrumentation.ts`
- **Job patterns**: Use typed job data with Zod validation

---

## 10. Directory-Specific AGENTS.md Files

- **Always check for `AGENTS.md` files in specific directories** before working on code within them. These files contain targeted context.
- If a directory's `AGENTS.md` is outdated or incorrect, **update it**.
- If you make significant changes to a directory's structure, patterns, or critical implementation details, **document these in its `AGENTS.md`**.
- If a directory lacks a `AGENTS.md` but contains complex logic or patterns worth documenting for AI/humans, **suggest creating one**.

---

## 11. Database patterns

- **Prisma ORM**: Type-safe database access
- **Custom client output**: Generated to `src/generated/prisma/`
- **Migrations**: Managed through Prisma CLI
- **Schema patterns**: Use enums for constrained values (e.g., European cup sizes)

**Database pattern example**:

```typescript
import { prisma } from '@/lib/prisma'

export const createPerformer = async (data: CreatePerformerInput): Promise<Performer> => {
  return await prisma.performer.create({
    data: {
      name: data.name,
      cupSize: data.cupSize // European cup size enum
      // ... other fields
    }
  })
}
```

---

## 12. Common pitfalls

- Mixing test frameworks (use Vitest, not Jest syntax).
- Forgetting to run `pnpm exec prisma generate` after schema changes.
- Wrong current working directory (CWD) for commands/tests.
- Large AI refactors in a single commit (makes `git bisect` difficult).
- Delegating test/spec writing entirely to AI (can lead to false confidence).
- **Note about generated code**: Always regenerate after schema changes, never edit generated files directly.
- Using native JavaScript Date methods instead of date-fns functions for date/time operations.
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
- **date-fns**: Date utility library for consistent date/time operations, formatting, and calculations throughout the application
- **ms**: Millisecond utility library for parsing and formatting human-readable time durations

---

## 16. Meta: Guidelines for updating AGENTS.md files

### Elements that would be helpful to add:

1. **Decision flowchart**: A simple decision tree for "when to use X vs Y" for key architectural choices would guide my recommendations.
2. **Reference links**: Links to key files or implementation examples that demonstrate best practices.
3. **Domain-specific terminology**: A small glossary of project-specific terms would help me understand domain language correctly.
4. **Versioning conventions**: How the project handles versioning, both for APIs and internal components.

### Format preferences:

1. **Consistent syntax highlighting**: Ensure all code blocks have proper language tags (`typescript`, `bash`, etc.).
2. **Hierarchical organization**: Consider using hierarchical numbering for subsections to make referencing easier.
3. **Tabular format for key facts**: The tables are very helpful - more structured data in tabular format would be valuable.
4. **Keywords or tags**: Adding semantic markers (like `#performance` or `#security`) to certain sections would help me quickly locate relevant guidance.

[^1]: This principle emphasizes human oversight for critical aspects like architecture, testing, and domain-specific decisions, ensuring AI assists rather than fully dictates development.

---

## 17. Files to NOT modify

These files control which files should be ignored by AI tools and indexing systems:

- @.agentignore : Specifies files that should be ignored by the Cursor IDE, including:
  - Build and distribution directories
  - Environment and configuration files
  - Large data files
  - Generated documentation
  - Package-manager files (lock files)
  - Logs and cache directories
  - IDE and editor files
  - Compiled binaries and media files

- @.agentindexignore : Controls which files are excluded from Cursor's indexing to improve performance, including:
  - All files in `.agentignore`
  - Files that may contain sensitive information
  - Large JSON data files
  - Generated TypeSpec outputs
  - Memory-store migration files
  - Docker templates and configuration files

**Never modify these ignore files** without explicit permission, as they're carefully configured to optimize IDE performance while ensuring all relevant code is properly indexed.

**When adding new files or directories**, check these ignore patterns to ensure your files will be properly included in the IDE's indexing and AI assistance features.

---

## AI Assistant Workflow: Step-by-Step Methodology

When responding to user instructions, the AI assistant (Claude, Cursor, GPT, etc.) should follow this process to ensure clarity, correctness, and maintainability:

1. **Consult Relevant Guidance**: When the user gives an instruction, consult the relevant instructions from `AGENTS.md` files (both root and directory-specific) for the request.
2. **Clarify Ambiguities**: Based on what you could gather, see if there's any need for clarifications. If so, ask the user targeted questions before proceeding.
3. **Break Down & Plan**: Break down the task at hand and chalk out a rough plan for carrying it out, referencing project conventions and best practices.
4. **Trivial Tasks**: If the plan/request is trivial, go ahead and get started immediately.
5. **Non-Trivial Tasks**: Otherwise, present the plan to the user for review and iterate based on their feedback.
6. **Track Progress**: Use a to-do list (internally, or optionally in a `TODOS.md` file) to keep track of your progress on multi-step or complex tasks.
7. **If Stuck, Re-plan**: If you get stuck or blocked, return to step 3 to re-evaluate and adjust your plan.
8. **Update Documentation**: Once the user's request is fulfilled, update relevant anchor comments (`AIDEV-NOTE`, etc.) and `AGENTS.md` files in the files and directories you touched.
9. **User Review**: After completing the task, ask the user to review what you've done, and repeat the process as needed.
10. **Session Boundaries**: If the user's request isn't directly related to the current context and can be safely started in a fresh session, suggest starting from scratch to avoid context confusion.
