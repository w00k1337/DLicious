import 'server-only'

import { getPerformerIds } from '@/lib/api/stash'
import logger from '@/lib/logger'

import { getFlowProducer } from '../../connection'
import { getStashPerformerImportQueue } from '../stash-performer-import'
import { getStashPerformerBulkImportQueue } from './worker'

export const triggerPerformerBulkImport = async (): Promise<void> => {
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
      opts: {
        jobId: `import-stash-performer-${String(stashId)}`,
        removeOnComplete: true
      }
    }))
  })

  logger.debug({ performerCount: stashPerformerIds.length }, 'Bulk import triggered successfully')
}
