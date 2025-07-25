# Product Requirements Document: Task Queue System (BullMQ Integration)

## Introduction/Overview

DLicious requires a robust task queue system to manage the complex orchestration of data synchronization across multiple external APIs and services. The current architecture needs to coordinate operations between Stash, ThePornDB, StashDB, Sabnzbd, and Usenet search operations while maintaining reliability and preventing API rate limit violations.

This feature implements BullMQ, a battle-tested Redis-based queue system, to handle asynchronous task processing, scheduling, and retry logic. The initial focus will be on Stash API performer data synchronization, with the system designed to expand to all other data sources.

## Goals

1. **Reliable Data Synchronization**: Ensure consistent and fault-tolerant sync operations across all external data sources
2. **API Rate Limit Compliance**: Prevent overwhelming external APIs through controlled task execution and rate limiting
3. **Scalable Architecture**: Build a foundation that can grow from small-scale to large-scale operations (1000+ performers, 10000+ scenes daily)
4. **Operational Visibility**: Provide basic monitoring and management capabilities for task execution
5. **Developer Experience**: Create a clean abstraction for adding new background jobs and scheduled tasks

## User Stories

1. **As a system administrator**, I want performer data to sync automatically from Stash so that the local database stays current without manual intervention.

2. **As a developer**, I want to easily add new background tasks for additional data sources so that expanding integrations doesn't require architectural changes.

3. **As a system operator**, I want failed tasks to retry automatically with exponential backoff so that temporary network issues don't require manual intervention.

4. **As a system administrator**, I want to see basic task status (pending, completed, failed) so that I can monitor system health.

5. **As a user**, I want data synchronization to happen in the background so that my interface remains responsive during heavy processing operations.

6. **As a system operator**, I want critical task failures to generate alerts so that I can respond to persistent issues quickly.

## Functional Requirements

### Core Queue Infrastructure

1. **The system must integrate BullMQ with Redis as the backing store** for task persistence and coordination.

2. **The system must support multiple queue types** including immediate execution, scheduled tasks, and recurring jobs.

3. **The system must implement exponential backoff retry logic** for failed tasks with configurable retry attempts.

4. **The system must provide rate limiting capabilities** to prevent overwhelming external APIs.

5. **The system must support job prioritization** to ensure critical tasks execute before lower-priority background operations.

### Task Management

6. **The system must provide a task registration system** allowing developers to easily define new job types with TypeScript type safety.

7. **The system must support cron-like scheduling** for recurring synchronization operations.

8. **The system must implement task deduplication** to prevent duplicate jobs from being queued.

9. **The system must provide graceful shutdown** handling to complete in-progress tasks before application termination.

### Stash Integration (Phase 1)

10. **The system must implement a Stash performer sync job** that fetches performer data and updates the local database.

11. **The system must handle Stash API authentication** and session management within queued tasks.

12. **The system must detect and handle Stash API rate limits** by implementing appropriate delays and retry strategies.

13. **The system must sync performer metadata including** names, images, scenes count, and other relevant fields.

### Error Handling & Monitoring

14. **The system must log all task execution details** including start time, duration, success/failure status, and error messages.

15. **The system must integrate with the existing logger system** for consistent log formatting and output.

16. **The system must provide basic task status endpoints** for monitoring pending, active, completed, and failed jobs.

17. **The system must generate alerts for critical failures** that exceed retry thresholds.

### Web Interface Integration

18. **The system must provide API endpoints** for triggering manual sync operations from the web interface.

19. **The system must expose queue status information** through API endpoints for dashboard integration.

20. **The system must integrate with existing service layers** rather than duplicating business logic.

## Non-Goals (Out of Scope)

- **Advanced Queue UI**: No plans for a sophisticated queue management interface beyond basic status monitoring
- **Multi-tenant Support**: Single-instance operation only for initial implementation
- **Real-time Task Streaming**: WebSocket-based real-time task updates not included
- **Custom Queue Dashboard**: Will not build a custom dashboard; basic API endpoints only
- **Message Queuing**: Focus on job processing, not general message passing between services
- **Distributed Processing**: Single-node operation initially; clustering capabilities not required

## Design Considerations

### Technology Stack

- **BullMQ**: Primary queue implementation with Redis backend
- **Redis**: Task persistence and coordination (separate from session storage if needed)
- **TypeScript**: Full type safety for job definitions and handlers
- **Integration**: Direct integration with existing service layer architecture

### Service Layer Integration

- Leverage existing API clients (`src/lib/api/stash/`, etc.)
- Maintain consistent error handling patterns from current codebase
- Use existing Prisma database models and operations
- Follow established logging practices

### Queue Structure

```typescript
// Example job type definitions
interface StashPerformerSyncJob {
  performerId?: string // specific performer or all
  fullSync?: boolean // complete refresh vs incremental
}

interface SceneMetadataJob {
  sceneId: string
  sources: ('tpdb' | 'stashdb')[]
}
```

## Technical Considerations

### Dependencies

- Add `bullmq` and `ioredis` to package.json
- Ensure Redis availability in development and production environments
- Consider Redis memory requirements for job storage

### Database Integration

- Extend existing Prisma schema with job tracking tables if needed for audit trails
- Maintain consistency with current database transaction patterns

### Environment Configuration

- Redis connection configuration via environment variables
- Queue processing concurrency settings
- Retry attempt and delay configurations

### Performance

- Configure appropriate concurrency levels to balance throughput and resource usage
- Implement job batching where applicable (e.g., bulk performer updates)
- Monitor Redis memory usage as job volume grows

## Success Metrics

1. **Reliability**: 99%+ success rate for Stash performer sync operations
2. **Performance**: Performer sync completes within 5 minutes for collections up to 1000 performers
3. **Error Recovery**: 95% of transient failures resolve through automatic retry logic
4. **Developer Adoption**: New background tasks can be implemented in under 30 minutes
5. **System Stability**: No queue-related application crashes or memory leaks over 30-day periods

## Open Questions

1. **Redis Deployment**: Should Redis be containerized with the application or managed separately?
2. **Job Retention**: How long should completed/failed job data be retained for debugging purposes?
3. **Alerting Integration**: What alerting mechanism should be used for critical task failures (email, Slack, logs only)?
4. **Monitoring Integration**: Should queue metrics integrate with existing application monitoring tools?
5. **Development Testing**: How should queue operations be handled in automated tests (mock vs real Redis)?

## Implementation Phases

### Phase 1: Core Infrastructure + Stash Sync

- BullMQ setup and configuration
- Basic job registration and execution framework
- Stash performer sync implementation
- Error handling and retry logic
- Basic status monitoring endpoints

### Phase 2: Expanded Data Sources

- ThePornDB scene metadata jobs
- StashDB sync operations
- Sabnzbd download status monitoring
- Usenet search task integration

### Phase 3: Advanced Features

- Web UI integration for manual job triggering
- Enhanced monitoring and alerting
- Performance optimization and scaling considerations
