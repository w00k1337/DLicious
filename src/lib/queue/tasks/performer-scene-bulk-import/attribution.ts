import { findExistingHashes, findSceneIdsByHashIds, findScenesByExt } from './database'
import { collectHashPairs, DuplicateTracker } from './duplicate-tracker'
import type { DataSource, NormalizedScene, PerformerSceneBulkImportJobResult } from './types'

interface ComputeSourceAttributionResult {
  createdPerSource: Record<DataSource, number>
  dupBySource: Record<DataSource, number>
  contributedPerSource: Record<DataSource, number>
}

export const computeSourceAttribution = async (
  allScenes: NormalizedScene[],
  dedupedScenes: NormalizedScene[]
): Promise<ComputeSourceAttributionResult> => {
  const stashIds = Array.from(
    new Set(
      allScenes
        .filter(
          (s): s is NormalizedScene & { stashId: number } => s.source === 'stash' && typeof s.stashId === 'number'
        )
        .map(s => s.stashId)
    )
  )
  const stashDbIds = Array.from(
    new Set(
      allScenes
        .filter((s): s is NormalizedScene & { stashDbId: string } => s.source === 'stashDb' && !!s.stashDbId)
        .map(s => s.stashDbId)
    )
  )
  const thePornDbIds = Array.from(
    new Set(
      allScenes
        .filter((s): s is NormalizedScene & { thePornDbId: string } => s.source === 'thePornDb' && !!s.thePornDbId)
        .map(s => s.thePornDbId)
    )
  )

  const existingByExt = await findScenesByExt({ stashIds, stashDbIds, thePornDbIds })
  const allHashPairs = collectHashPairs(allScenes)
  const existingHashIdMap = await findExistingHashes(allHashPairs)
  const existingHashIds = Array.from(existingHashIdMap.values())
  const sceneIdsByHashId = await findSceneIdsByHashIds(existingHashIds)

  const tracker = new DuplicateTracker(allScenes, { existingByExt, existingHashIdMap, sceneIdsByHashId })
  const dupBySource = tracker.computeDuplicateCountsBySource()
  const createdPerSource = tracker.computeCreatedCountsBySource()
  const contributedPerSource = tracker.computeContributionBySource(dedupedScenes)

  return { createdPerSource, dupBySource, contributedPerSource }
}

export const applyAttributionToDataSources = (
  dataSources: PerformerSceneBulkImportJobResult['dataSources'],
  dupBySource: Record<DataSource, number>,
  createdPerSource: Record<DataSource, number>,
  contributedPerSource: Record<DataSource, number>
): void => {
  if (dataSources.stash) {
    dataSources.stash.contributedCount = contributedPerSource.stash
    dataSources.stash.importedCount = createdPerSource.stash
    dataSources.stash.duplicatesCount = dupBySource.stash
    dataSources.stash.crossSourceDuplicates = dataSources.stash.fetchedCount - contributedPerSource.stash
  }
  if (dataSources.stashDb) {
    dataSources.stashDb.contributedCount = contributedPerSource.stashDb
    dataSources.stashDb.importedCount = createdPerSource.stashDb
    dataSources.stashDb.duplicatesCount = dupBySource.stashDb
    dataSources.stashDb.crossSourceDuplicates = dataSources.stashDb.fetchedCount - contributedPerSource.stashDb
  }
  if (dataSources.thePornDb) {
    dataSources.thePornDb.contributedCount = contributedPerSource.thePornDb
    dataSources.thePornDb.importedCount = createdPerSource.thePornDb
    dataSources.thePornDb.duplicatesCount = dupBySource.thePornDb
    dataSources.thePornDb.crossSourceDuplicates = dataSources.thePornDb.fetchedCount - contributedPerSource.thePornDb
  }
}
