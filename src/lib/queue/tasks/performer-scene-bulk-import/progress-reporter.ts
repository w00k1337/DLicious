import type { Job } from 'bullmq'

import type { PerformerSceneBulkImportJobData, PerformerSceneBulkImportJobResult } from './types'

/**
 * Simple progress reporter that maps a step index to a percentage range.
 * Useful to separate progress concerns from processing logic.
 */
export class ProgressReporter {
  private job: Job<PerformerSceneBulkImportJobData, PerformerSceneBulkImportJobResult>
  private start: number
  private end: number

  constructor(
    job: Job<PerformerSceneBulkImportJobData, PerformerSceneBulkImportJobResult>,
    startPercent = 0,
    endPercent = 100
  ) {
    this.job = job
    this.start = Math.max(0, Math.min(100, startPercent))
    this.end = Math.max(this.start, Math.min(100, endPercent))
  }

  async set(percent: number): Promise<void> {
    const p = Math.round(Math.max(0, Math.min(100, percent)))
    await this.job.updateProgress(p)
  }

  /**
   * Report progress for the Nth step out of total steps, mapped into [start,end].
   */
  async step(index: number, total: number): Promise<void> {
    if (total <= 0) return
    const clamped = Math.max(0, Math.min(total, index))
    const frac = clamped / total
    const percent = this.start + (this.end - this.start) * frac
    await this.set(percent)
  }
}

export default ProgressReporter
