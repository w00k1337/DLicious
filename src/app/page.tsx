import { ReactElement } from 'react'

import { triggerStashPerformerBulkImport } from '@/lib/queue'

const Home = async (): Promise<ReactElement> => {
  await triggerStashPerformerBulkImport()

  return <h1>DLicious</h1>
}

export default Home
