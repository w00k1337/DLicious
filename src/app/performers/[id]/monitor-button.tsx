'use client'

import { Monitor } from 'lucide-react'
import { ReactElement } from 'react'
import { useFormStatus } from 'react-dom'

import { Button } from '@/components/ui/button'
import { togglePerformerMonitoringFormAction } from '@/lib/actions'

interface MonitorButtonProps {
  performerId: string
  initialIsMonitored: boolean
}

interface MonitorFormButtonProps {
  initialIsMonitored: boolean
}

const MonitorFormButton = ({ initialIsMonitored }: MonitorFormButtonProps): ReactElement => {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      variant={initialIsMonitored ? 'default' : 'outline'}
      className="w-full"
      size="sm"
      disabled={pending}
    >
      <Monitor className="mr-2 h-4 w-4" />
      {pending ? 'Updating...' : initialIsMonitored ? 'Monitoring' : 'Start Monitoring'}
    </Button>
  )
}

export const MonitorButton = ({ performerId, initialIsMonitored }: MonitorButtonProps): ReactElement => {
  return (
    <form action={togglePerformerMonitoringFormAction}>
      <input type="hidden" name="performerId" value={performerId} />
      <MonitorFormButton initialIsMonitored={initialIsMonitored} />
    </form>
  )
}
