import { ReactElement } from 'react'

// import { stashPerformerBulkImportTask } from '@/lib/queue/tasks/stash-performer-bulk-import'
// import { performerSceneBulkImportTask } from '@/lib/queue/tasks/performer-scene-bulk-import'

const Home = (): ReactElement => {
  // await stashPerformerBulkImportTask.trigger({})
  // Dev: manual trigger example
  // await performerSceneBulkImportTask.trigger({ performerId: 80 })
  return <h1>DLicious</h1>
}

export default Home
