import { ReactElement } from 'react'

// import { triggerPerformerSceneBulkImport, triggerStashPerformerBulkImport } from '@/lib/queue'

const Home = async (): Promise<ReactElement> => {
  await Promise.resolve()
  // await triggerStashPerformerBulkImport()
  // await triggerPerformerSceneBulkImport(46)

  return <h1>DLicious</h1>
}

export default Home
