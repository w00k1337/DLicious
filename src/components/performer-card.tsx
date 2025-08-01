'use client'

import { Heart, Monitor, User } from 'lucide-react'
import Image from 'next/image'
import { ReactElement, useOptimistic, useTransition } from 'react'

import { toggleMonitoringAction } from '@/app/actions/performers'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import type { Performer } from '@/generated/prisma'

interface PerformerCardProps {
  performer: Performer
}

export const PerformerCard = ({ performer }: PerformerCardProps): ReactElement => {
  const [isPending, startTransition] = useTransition()
  const [optimisticMonitored, setOptimisticMonitored] = useOptimistic(performer.isMonitored)

  const handleMonitoringToggle = (checked: boolean): void => {
    startTransition(() => {
      setOptimisticMonitored(checked)
      void toggleMonitoringAction(performer.id, checked)
    })
  }

  return (
    <Card className="w-full max-w-sm">
      <CardContent className="p-4">
        <div className="relative mb-3">
          <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-muted">
            {performer.imageUrl ? (
              <Image
                src={performer.imageUrl}
                alt={performer.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <User className="h-16 w-16 text-muted-foreground" />
              </div>
            )}
          </div>

          <Button
            variant={performer.isFavorite ? 'default' : 'outline'}
            size="icon"
            className="absolute top-2 right-2"
            disabled={isPending}
          >
            <Heart className={`h-4 w-4 ${performer.isFavorite ? 'fill-current' : ''}`} />
          </Button>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg leading-tight font-semibold">{performer.name}</h3>

          <div className="flex flex-wrap gap-1">
            {(performer.cupSize ?? performer.bandSize) && (
              <Badge variant="secondary" className="text-xs">
                {performer.bandSize}
                {performer.cupSize}
              </Badge>
            )}
            {performer.hasNaturalBreasts === true && (
              <Badge variant="outline" className="text-xs">
                Natural
              </Badge>
            )}
            {performer.hasNaturalBreasts === false && (
              <Badge variant="outline" className="text-xs">
                Enhanced
              </Badge>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="px-4 pt-0 pb-4">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center space-x-2">
            <Monitor className="h-4 w-4" />
            <span className="text-sm">Monitor</span>
          </div>
          <Switch checked={optimisticMonitored} onCheckedChange={handleMonitoringToggle} disabled={isPending} />
        </div>
      </CardFooter>
    </Card>
  )
}
