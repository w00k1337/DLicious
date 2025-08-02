'use client'

import { ReactElement } from 'react'
import { useFormStatus } from 'react-dom'

import { Button } from '@/components/ui/button'

interface ImportButtonProps {
  isImportRunning: boolean
}

export const ImportButton = ({ isImportRunning }: ImportButtonProps): ReactElement => {
  const { pending } = useFormStatus()
  const isDisabled = isImportRunning || pending

  return (
    <Button type="submit" disabled={isDisabled}>
      {pending ? 'Starting Import...' : isImportRunning ? 'Import in Progress...' : 'Import'}
    </Button>
  )
}
