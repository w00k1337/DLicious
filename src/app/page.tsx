import { ReactElement } from 'react'

const Home = async (): Promise<ReactElement> => {
  await Promise.resolve()

  return <h1>DLicious</h1>
}

export default Home
