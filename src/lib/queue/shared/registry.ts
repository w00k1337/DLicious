import { Worker } from 'bullmq'

import logger from '@/lib/logger'

// Import all task modules directly for better bundling
import performerSceneBulkImportTask from '../tasks/performer-scene-bulk-import'
import stashPerformerBulkImportTask from '../tasks/stash-performer-bulk-import'
import type { TaskRegistryEntry } from './types'

class TaskRegistry {
  private tasks = new Map<string, TaskRegistryEntry>()
  private initialized = false

  initialize(): void {
    if (this.initialized) return

    // Register all tasks
    this.registerTask(performerSceneBulkImportTask.queueName, performerSceneBulkImportTask)
    this.registerTask(stashPerformerBulkImportTask.queueName, stashPerformerBulkImportTask)

    this.initialized = true

    logger.info(`Registered ${String(this.tasks.size)} tasks: ${Array.from(this.tasks.keys()).join(', ')}`)
  }

  private registerTask<TJobData = unknown, TJobResult = unknown>(
    name: string,
    module: TaskRegistryEntry<TJobData, TJobResult>['module']
  ): void {
    this.tasks.set(name, {
      name,
      module: module as TaskRegistryEntry['module']
    })
  }

  getTask<TJobData = unknown, TJobResult = unknown>(name: string): TaskRegistryEntry<TJobData, TJobResult> | undefined {
    return this.tasks.get(name) as TaskRegistryEntry<TJobData, TJobResult> | undefined
  }

  getAllTasks(): TaskRegistryEntry[] {
    return Array.from(this.tasks.values())
  }

  getWorkers(): Worker[] {
    return this.getAllTasks().map(entry => entry.module.createWorker())
  }

  hasTask(name: string): boolean {
    return this.tasks.has(name)
  }
}

export const taskRegistry = new TaskRegistry()
