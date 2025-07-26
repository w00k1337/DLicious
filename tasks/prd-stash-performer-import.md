# Product Requirements Document: Stash Performer Import System

## Introduction/Overview

This feature implements a robust import system to synchronize performer data from Stash into the DLicious PostgreSQL database using BullMQ as the job queue system. The system will import all performer fields defined in the existing Stash API fragments, handle both manual and scheduled imports, and serve as the foundation for future import capabilities for other data types like scenes.

The goal is to maintain data consistency between Stash and DLicious while providing a scalable, type-safe queue system for future data import needs.

## Goals

1. **Data Synchronization**: Import all performer data from Stash GraphQL API into PostgreSQL via Prisma
2. **Queue Infrastructure**: Establish BullMQ-based job queue system with full TypeScript integration
3. **Reliability**: Implement retry mechanisms and error handling for network failures
4. **Flexibility**: Support both manual user-triggered imports and automated scheduled imports
5. **Extensibility**: Create a foundation that can easily accommodate future imports (scenes, studios, tags)
6. **Type Safety**: Leverage BullMQ's TypeScript features for job definitions, queues, and workers

## User Stories

1. **As an admin**, I want to manually trigger a performer import so that I can immediately sync new performers from Stash
2. **As an admin**, I want the system to automatically import performers on a schedule so that data stays current without manual intervention
3. **As a system**, I want to retry failed imports so that temporary network issues don't cause data loss
4. **As a developer**, I want a type-safe queue system so that I can easily add new import types in the future
5. **As an admin**, I want to see failed import logs so that I can troubleshoot data sync issues

## Functional Requirements

### Core Import Functionality

1. **FR-001**: The system must import all performer fields defined in `PerformerFieldsFragment` from Stash GraphQL API
2. **FR-002**: The system must use the existing Stash API client (`@/stash`) for all Stash connections
3. **FR-003**: The system must handle both new performer creation and existing performer updates based on `stashId`
4. **FR-004**: The system must process performers individually (not in batches) for granular error handling
5. **FR-005**: The system must map Stash performer data to the existing Prisma `Performer` model schema

### Queue System Requirements

6. **FR-006**: The system must use BullMQ for job queue management with full TypeScript integration
7. **FR-007**: The system must define type-safe job data interfaces (e.g., `ImportStashPerformerJobData`) for all import operations
8. **FR-008**: The system must define type-safe job result interfaces (e.g., `ImportStashPerformerJobResult`) for all import operations
9. **FR-009**: The system must use strongly-typed queue names via union types (e.g., `QueueName = 'stash-performer-import' | 'stash-scene-import'`)
10. **FR-010**: The system must implement separate queues for different import types to enable future extensibility
11. **FR-011**: The system must support both immediate job execution and scheduled job execution

### Import Triggers

12. **FR-012**: The system must provide an API endpoint to manually trigger performer imports
13. **FR-013**: The system must support scheduled automatic imports (configurable timing)
14. **FR-014**: The system must support both full sync and incremental sync modes

### Error Handling & Reliability

15. **FR-015**: The system must retry failed individual performer imports with exponential backoff
16. **FR-016**: The system must log all failed imports with sufficient context for debugging
17. **FR-017**: The system must throw errors for network failures to Stash (fail fast approach)
18. **FR-018**: The system must continue processing remaining performers when individual imports fail

### Data Management

19. **FR-019**: The system must update `syncedAt` timestamp for successfully imported performers
20. **FR-020**: The system must preserve existing `isMonitored` and `isFavorite` user settings during updates
21. **FR-021**: The system must handle performer data transformations (measurements parsing, date formatting, etc.)

## Non-Goals (Out of Scope)

1. **Real-time monitoring UI**: No progress tracking interface in MVP
2. **Import pause/cancel functionality**: No job control features in MVP
3. **Scene, studio, or tag imports**: Only performer import in initial version
4. **Performance optimization**: No specific performance requirements beyond basic functionality
5. **Bulk operations**: No batch processing or bulk import features
6. **Data validation beyond schema**: No business logic validation of performer data
7. **Import history/audit trail**: No tracking of import operations over time

## Technical Considerations

### Dependencies

- **BullMQ**: Job queue system with Redis backend
- **Existing Stash API client**: Use `@/stash` for GraphQL operations
- **Prisma**: Database operations using existing `Performer` model
- **Redis**: Required for BullMQ job storage and management

### Architecture Components

- **Job Type Definitions**: Strongly-typed interfaces for job data and results (`ImportStashPerformerJobData`, `ImportStashPerformerJobResult`)
- **Queue Name Types**: Union type for all queue names (`QueueName = 'stash-performer-import' | 'stash-scene-import'`)
- **Queue Factory**: Centralized queue creation and management with type safety
- **Worker Implementation**: Type-safe job processors with typed job data and return values
- **API Routes**: Endpoints for manual import triggering
- **Scheduler**: Automated job scheduling system

### Data Flow

1. Job triggered (manual API call or scheduled)
2. Queue adds import job to BullMQ
3. Worker processes job, fetches performers from Stash
4. Individual performer data mapped and upserted to PostgreSQL
5. Success/failure logged, retry logic applied for failures

### Integration Points

- **Stash GraphQL API**: Using existing `PerformerFieldsFragment`
- **Prisma Database**: Using existing `Performer` model with `stashId` as unique key
- **Redis**: For BullMQ job storage
- **Logging System**: Using existing pino logger

## Success Metrics

1. **Data Accuracy**: 100% of available performers imported with correct field mapping
2. **Reliability**: 95% success rate for individual performer imports under normal network conditions
3. **Performance**: Ability to process 1000+ performers without system degradation
4. **Type Safety**: Zero runtime type errors in queue job processing
5. **Extensibility**: New import types can be added with minimal code changes to core infrastructure

## Design Considerations

### Queue Organization

- Separate queues for different import types using `QueueName` union type (`'stash-performer-import'`, future: `'stash-scene-import'`)
- Strongly-typed job data interfaces following pattern: `Import{Type}JobData` and `Import{Type}JobResult`
- Type-safe queue creation and worker registration
- Consistent naming conventions across all queue types

### Error Recovery

- Exponential backoff for retries (1s, 2s, 4s, 8s, 16s max)
- Maximum 5 retry attempts per job
- Dead letter queue for permanently failed jobs

### Data Consistency

- Use database transactions for performer updates
- Handle concurrent import scenarios gracefully
- Maintain referential integrity with existing data

## TypeScript Integration Examples

Based on your requirements for maximum BullMQ TypeScript integration, here are the key type patterns:

### Job Type Definitions

```typescript
export interface ImportStashPerformerJobData {
  stashId: number
}

export interface ImportStashPerformerJobResult {
  stashId: number
  name: string
}

export type QueueName = 'stash-performer-import' | 'stash-scene-import'
```

### Queue and Worker Type Safety

- All queues must be created using the `QueueName` union type
- Workers must be strongly typed with job data and result interfaces
- Job processors must return typed results matching the corresponding `JobResult` interface
- Queue operations must use generic types for full type safety

## Open Questions

1. **Redis Configuration**: ~~Should Redis be configured as a shared service or dedicated to queue operations?~~ **RESOLVED**: Start with shared Redis service since this is first Redis usage for DLicious - can optimize later if needed
2. **Scheduling Frequency**: ~~What should be the default schedule for automatic imports? (daily, weekly?)~~ **RESOLVED**: Daily automatic imports to keep performer data current
3. **Job Retention**: ~~How long should completed/failed jobs be retained in Redis?~~ **RESOLVED**: Remove completed jobs immediately, retain failed jobs for 7 days for debugging
4. **Monitoring Integration**: ~~Should failed jobs integrate with existing logging/monitoring systems?~~ **RESOLVED**: Use existing pino logger for failed jobs, no external monitoring in MVP
5. **Development Environment**: ~~How should the queue system work in development without requiring Redis?~~ **RESOLVED**: Use free Redis database at redis.io for development, so Redis is always required
6. **Deployment Strategy**: ~~Should workers run as separate processes or within the main application?~~ **RESOLVED**: Workers run within main application for MVP simplicity, can extract later if needed
7. **Type Organization**: ~~Should all job type definitions be in a single file or organized by queue type?~~ **RESOLVED**: Start with single file for all job types, refactor if it grows too large
