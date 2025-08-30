interface ProgressStage {
  name: string
  percentage: number
}

const progressStages: ProgressStage[] = [
  { name: 'initialization', percentage: 10 },
  { name: 'fetching', percentage: 25 },
  { name: 'processing', percentage: 90 },
  { name: 'completion', percentage: 100 }
]

export const computeProgress = (
  stage: 'initialization' | 'fetching' | 'processing' | 'completion',
  pageProgress?: { current: number; total: number }
): number => {
  const stageInfo = progressStages.find(s => s.name === stage)
  if (!stageInfo) return 0

  if (stage === 'processing' && pageProgress) {
    const baseProgress = progressStages.find(s => s.name === 'fetching')?.percentage ?? 25
    const processingRange = stageInfo.percentage - baseProgress
    const pageProgressPercentage = (pageProgress.current / pageProgress.total) * processingRange
    return Math.round(baseProgress + pageProgressPercentage)
  }

  return stageInfo.percentage
}
