'use client'

import { Download } from 'lucide-react'
import { ReactElement, useState, useTransition } from 'react'

import { triggerBulkImportAction } from '@/app/actions/performers'
import { Button } from '@/components/ui/button'

export const BulkImportButton = (): ReactElement => {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleBulkImport = (): void => {
    startTransition(async () => {
      setMessage(null)
      const result = await triggerBulkImportAction()

      if (result.success) {
        setMessage({ type: 'success', text: 'Bulk import started successfully!' })
        setTimeout(() => {
          setMessage(null)
        }, 5000)
      } else {
        setMessage({ type: 'error', text: result.error ?? 'Failed to start bulk import' })
        setTimeout(() => {
          setMessage(null)
        }, 5000)
      }
    })
  }

  return (
    <div className="space-y-2">
      <Button onClick={handleBulkImport} disabled={isPending} className="w-full">
        <Download className="mr-2 h-4 w-4" />
        {isPending ? 'Starting Import...' : 'Bulk Import Performers'}
      </Button>

      {message && (
        <div className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
          {message.text}
        </div>
      )}
    </div>
  )
}
