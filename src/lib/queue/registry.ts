/**
 * Job Registry
 *
 * Type-safe job registration system (stub for now)
 */

import type { BaseJobData, JobRegistration } from './types'

// TODO: Implement full job registry in T3 tasks
export class JobRegistry {
  private readonly jobs = new Map<string, JobRegistration>()

  register<T extends BaseJobData>(registration: JobRegistration<T>): void {
    if (this.jobs.has(registration.type)) {
      throw new Error(`Job type '${registration.type}' is already registered`)
    }
    this.jobs.set(registration.type, registration as JobRegistration)
  }

  get(jobType: string): JobRegistration | undefined {
    return this.jobs.get(jobType)
  }

  has(jobType: string): boolean {
    return this.jobs.has(jobType)
  }

  getAll(): ReadonlyMap<string, JobRegistration> {
    return this.jobs
  }

  clear(): void {
    this.jobs.clear()
  }
}

// Global registry instance
export const jobRegistry = new JobRegistry()
