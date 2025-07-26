## Relevant Files

- `src/lib/queue/workers/performer-import.ts` - BullMQ worker implementation for processing performer import jobs
- `src/lib/queue/workers/__tests__/performer-import.test.ts` - Comprehensive unit tests for performer import worker covering all lifecycle methods and error scenarios
- `src/lib/import/performer.ts` - Core performer import logic and data transformation functions
- `src/lib/import/__tests__/performer.test.ts` - Comprehensive unit tests for performer import functions with extensive edge case coverage
- `src/lib/utils/size-conversion.ts` - Utility functions for converting US measurements to European formats
- `src/lib/utils/__tests__/size-conversion.test.ts` - Comprehensive unit tests for size conversion utilities
- `src/app/api/import/performers/route.ts` - API route handler for manual performer import triggering
- `src/app/api/import/performers/__tests__/route.test.ts` - Comprehensive unit tests for import API route covering all HTTP scenarios and edge cases
- `src/test/__tests__/performer-import-integration.test.ts` - Integration tests for end-to-end performer import workflow covering API, queue, database, and error handling
- `src/test/__tests__/performer-import-error-scenarios.test.ts` - Comprehensive error scenario tests covering network failures, invalid data, database errors, and resource exhaustion
- `src/lib/scheduler/index.ts` - Job scheduling system for automated imports (REMOVED - Not needed for MVP)
- `src/lib/scheduler/__tests__/index.test.ts` - Unit tests for scheduler functionality (REMOVED - Not needed for MVP)

### Notes

- Unit tests should be placed in a `__tests__` subfolder within the same directory as the code files they are testing (e.g., `performer-import.ts` and `__tests__/performer-import.test.ts`).
- Use `pnpm vitest [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Vitest configuration.

## Tasks

- [x] 1.0 Implement BullMQ Worker for Performer Import Processing
  - [x] 1.1 Create `src/lib/queue/workers/performer-import.ts` with type-safe BullMQ worker implementation
  - [x] 1.2 Import and use existing Stash API `getPerformers()` function for data fetching
  - [x] 1.3 Implement job processor function with typed job data and return values
  - [x] 1.4 Add proper error handling with logging using existing pino logger
  - [x] 1.5 Export worker instance and register it with the performer import queue
  - [x] 1.6 Implement worker lifecycle management (start/stop functionality)

- [x] 2.0 Create Core Performer Import Logic and Data Transformation
  - [x] 2.1 Create `src/lib/import/performer.ts` with performer transformation functions
  - [x] 2.2 Implement `transformStashPerformerToPrisma()` function to map Stash data to Prisma schema
  - [x] 2.3 Add `upsertPerformer()` function for database operations using existing Prisma client
  - [x] 2.4 Handle data transformations (measurements parsing, date formatting, country mapping)
  - [x] 2.5 Preserve existing `isMonitored` and `isFavorite` user settings during updates
  - [x] 2.6 Update `syncedAt` timestamp for successfully imported performers
  - [x] 2.7 Implement individual performer processing with granular error handling

- [x] 3.0 Build API Endpoint for Manual Import Triggering
  - [x] 3.1 Create `src/app/api/import/performers/route.ts` with POST handler for manual imports
  - [x] 3.2 Implement request validation using Zod schemas
  - [x] 3.3 Add job queueing logic using existing `performerImportQueue`
  - [x] 3.4 Support both full sync and individual performer import modes
  - [x] 3.5 Return appropriate HTTP responses with job status information
  - [x] 3.6 Add proper authentication/authorization checks for admin access
  - [x] 3.7 Implement rate limiting to prevent abuse

- [x] 4.0 Implement Job Scheduling System for Automated Imports (REMOVED - Not needed for MVP)
  - [x] 4.1 Create `src/lib/scheduler/index.ts` with job scheduling functionality (REMOVED - Not needed for MVP)
  - [x] 4.2 Implement daily automated performer import scheduling using BullMQ's repeat options (REMOVED - Not needed for MVP)
  - [x] 4.3 Add configurable scheduling options through environment variables (REMOVED - Not needed for MVP)
  - [x] 4.4 Create scheduler initialization and management functions (REMOVED - Not needed for MVP)
  - [x] 4.5 Implement proper cleanup and shutdown handling for scheduled jobs (REMOVED - Not needed for MVP)
  - [x] 4.6 Add logging for scheduled job execution and status (REMOVED - Not needed for MVP)

- [x] 5.0 Add Comprehensive Testing and Error Handling
  - [x] 5.1 Create unit tests for performer import worker (`src/lib/queue/workers/__tests__/performer-import.test.ts`)
  - [x] 5.2 Create unit tests for core import logic (`src/lib/import/__tests__/performer.test.ts`)
  - [x] 5.3 Create unit tests for API endpoint (`src/app/api/import/performers/__tests__/route.test.ts`)
  - [x] 5.4 Create unit tests for scheduler (`src/lib/scheduler/__tests__/index.test.ts`) (REMOVED - Not needed for MVP)
  - [x] 5.5 Add integration tests for end-to-end import workflow
  - [x] 5.6 Test error scenarios (network failures, invalid data, database errors)
  - [x] 5.7 Verify retry mechanisms and exponential backoff behavior
  - [x] 5.8 Test concurrent import handling and data consistency (REMOVED - Not needed for MVP)
