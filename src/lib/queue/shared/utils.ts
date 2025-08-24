import type { JobsOptions, Worker } from 'bullmq'

import { taskRegistry } from './registry'
import type { TaskRegistryEntry } from './types'

/**
 * Initialize the task registry and start all workers
 * Call this once during application startup
 */
export const initializeQueueSystem = (): {
  taskCount: number
  workers: Worker[]
} => {
  taskRegistry.initialize()

  // Start all workers
  const workers = taskRegistry.getWorkers()

  return {
    taskCount: taskRegistry.getAllTasks().length,
    workers
  }
}

/**
 * Get a task by name with type safety
 */
export const getTask = <TJobData = unknown, TJobResult = unknown>(
  name: string
): TaskRegistryEntry<TJobData, TJobResult> | undefined => {
  return taskRegistry.getTask<TJobData, TJobResult>(name)
}

/**
 * Trigger a task by name
 */
export const triggerTask = async <TJobData = unknown, TJobResult = unknown>(
  taskName: string,
  data: TJobData,
  options?: Partial<JobsOptions>
): Promise<ReturnType<TaskRegistryEntry<TJobData, TJobResult>['module']['trigger']>> => {
  const task = taskRegistry.getTask<TJobData, TJobResult>(taskName)

  if (!task)
    throw new Error(
      `Task '${taskName}' not found. Available tasks: ${taskRegistry
        .getAllTasks()
        .map(t => t.name)
        .join(', ')}`
    )

  return task.module.trigger(data, options)
}

export const chunk = <T>(arr: T[], size: number): T[][] => {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}
