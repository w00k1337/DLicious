'use server'

import { revalidatePath } from 'next/cache'

import { triggerPerformerBulkImport } from '@/lib/queue/jobs/stash-performer-bulk-import'

export const importPerformersAction = async (): Promise<void> => {
  await triggerPerformerBulkImport()

  revalidatePath('/')
  revalidatePath('/performers')
}
