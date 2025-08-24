# Queue Tasks

This directory contains all queue tasks following the new scalable structure. Each task is a self-contained module that exports a standardized interface.

## Adding a New Task

1. Create a new directory with your task name (e.g., `my-new-task/`)
2. Implement the required files:
   - `index.ts` - Main task module with standard interface
   - `types.ts` - Job data and result types
   - `processor.ts` - Business logic

3. Export a default object implementing `TaskModule` interface:

```typescript
// src/lib/queue/tasks/my-new-task/index.ts
import type { TaskModule } from '../../shared/types'
// ... other imports

const queueName: 'my-new-task'

const myNewTask: TaskModule<MyJobData, MyJobResult> = {
  queueName,
  createQueue: () => createQueue(queueName),
  createWorker: () => createWorker(),
  trigger: async (data, options) => {
    const queue = myNewTask.createQueue()
    return queue.add('process-my-task', data, options)
  }
}

export default myNewTask
```

The task must be **manually registered** in the task registry. Add it to the `initialize()` method in `src/lib/queue/shared/registry.ts`:

```typescript
// In registry.ts initialize() method
this.registerTask(myNewTask.queueName, myNewTask)
```

## Using Tasks

```typescript
import { triggerTask, getTask, listTasks } from '@/lib/queue'

// List all available tasks
const tasks = listTasks()

// Trigger a task by name
await triggerTask('my-new-task', {
  /* job data */
})

// Get a specific task for advanced usage
const task = getTask<MyJobData, MyJobResult>('my-new-task')
if (task) {
  await task.module.trigger(data)
}
```

## Naming Conventions

- **Directory name**: kebab-case (e.g., `stash-performer-bulk-import`)
- **Queue name**: kebab-case (e.g., `stash-performer-bulk-import`)
- **Function names**: camelCase (e.g., `getStashPerformerBulkImportQueue`)
- **Type names**: PascalCase (e.g., `StashPerformerBulkImportJobData`)

## Best Practices

- **Type Safety**: Always use explicit return types for all functions
- **Error Handling**: Implement proper error handling in processors
- **Logging**: Use structured logging with job context
- **Idempotency**: Design jobs to be safely retryable
- **Monitoring**: Include meaningful metrics in job results
- **Testing**: Write tests for the processor logic
