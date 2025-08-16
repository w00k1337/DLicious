'use client'

import { ReactElement, useState } from 'react'

import { Button } from '@/components/ui/button'

import { importPerformersAction } from './actions'

export const ImportButton = (): ReactElement => {
  const [isLoading, setIsLoading] = useState(false)

  const handleImport = async (): Promise<void> => {
    setIsLoading(true)
    try {
      await importPerformersAction()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button onClick={() => void handleImport()} disabled={isLoading}>
      {isLoading ? 'Importing...' : 'Import Performers'}
    </Button>
  )
}
