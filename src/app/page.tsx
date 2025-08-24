import { ReactElement } from 'react'

import stashPerformerBulkImportTask from '@/lib/queue/tasks/stash-performer-bulk-import'

const Home = async (): Promise<ReactElement> => {
  await stashPerformerBulkImportTask.trigger({})

  return <h1>DLicious</h1>
}

export default Home
