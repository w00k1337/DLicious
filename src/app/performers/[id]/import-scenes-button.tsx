'use client'

import { Download } from 'lucide-react'
import { ReactElement } from 'react'
import { useFormStatus } from 'react-dom'

import { Button } from '@/components/ui/button'

export const ImportScenesButton = (): ReactElement => {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending} className="w-full">
      <Download className="mr-2 h-4 w-4" />
      {pending ? 'Importing Scenes...' : 'Import Scenes'}
    </Button>
  )
}
