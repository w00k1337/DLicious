'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

import { bulkImportScenes, syncPerformer, toggleMonitoring } from './actions'

interface PerformerActionsProps {
  performerId: string
  isMonitored: boolean
}

export const PerformerActions = ({ performerId, isMonitored }: PerformerActionsProps): React.ReactElement => {
  const [isPending, startTransition] = useTransition()

  const handleSync = (): void => {
    startTransition(async () => {
      try {
        await syncPerformer(performerId)
        toast.success('Sync started successfully')
      } catch (error) {
        toast.error('Failed to sync performer')
        console.error('Sync error:', error)
      }
    })
  }

  const handleToggleMonitoring = (): void => {
    startTransition(async () => {
      try {
        await toggleMonitoring(performerId)
        toast.success(isMonitored ? 'Monitoring disabled' : 'Monitoring enabled')
      } catch (error) {
        toast.error('Failed to toggle monitoring')
        console.error('Toggle monitoring error:', error)
      }
    })
  }

  const handleBulkImportScenes = (): void => {
    startTransition(async () => {
      try {
        await bulkImportScenes(performerId)
        toast.success('Bulk scene import started')
      } catch (error) {
        toast.error('Failed to start bulk scene import')
        console.error('Bulk import error:', error)
      }
    })
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant={isMonitored ? 'secondary' : 'default'} onClick={handleToggleMonitoring} disabled={isPending}>
        {isMonitored ? 'Unmonitor' : 'Monitor'}
      </Button>
      <Button variant="outline" onClick={handleSync} disabled={isPending}>
        Sync Now
      </Button>
      <Button variant="outline" onClick={handleBulkImportScenes} disabled={isPending}>
        Import All Scenes
      </Button>
    </div>
  )
}
