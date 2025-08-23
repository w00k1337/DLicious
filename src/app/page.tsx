import { ReactElement } from 'react'

import { triggerPerformerSceneBulkImport, triggerStashPerformerBulkImport } from '@/lib/queue'

const Home = async (): Promise<ReactElement> => {
  await triggerStashPerformerBulkImport()
  await triggerPerformerSceneBulkImport(1)

  return <h1>DLicious</h1>
}

export default Home
