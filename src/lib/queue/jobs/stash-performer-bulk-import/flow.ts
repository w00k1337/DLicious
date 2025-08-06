import { getPerformerIds } from '@/lib/api/stash'
import logger from '@/lib/logger'

import { getFlowProducer } from '../../flow-producer'
import { getStashPerformerImportQueue } from '../stash-performer-import'
import { getStashPerformerBulkImportQueue } from './queues'

export const triggerBulkImport = async (): Promise<void> => {
  logger.debug('Triggering bulk import of all performers')

  const stashPerformerIds = await getPerformerIds()

  if (stashPerformerIds.length === 0) {
    logger.warn('No performers found, skipping bulk import')
    return
  }

  await getFlowProducer().add({
    name: 'bulk-import-stash-performers',
    queueName: getStashPerformerBulkImportQueue().name,
    children: stashPerformerIds.map(stashId => ({
      name: 'import-stash-performer',
      queueName: getStashPerformerImportQueue().name,
      data: { stashId },
      // AIDEV-NOTE: We explicitly set the jobId and removeOnComplete to true to avoid importing the same performer multiple times
      opts: {
        jobId: `import-stash-performer-${String(stashId)}`,
        removeOnComplete: true
      }
    }))
  })

  logger.debug({ performerCount: stashPerformerIds.length }, 'Bulk import triggered successfully')
}
