import dayjs from 'dayjs'
import Image from 'next/image'
import { ReactElement } from 'react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

interface SceneCardProps {
  scene: {
    id: string
    title: string
    imageUrl: string
    releasedAt: Date
    stashId: number | null
    stashDbId: string | null
    hashes: {
      type: string
      value: string
    }[]
  }
}

// AIDEV-NOTE: Scene card component for displaying individual scenes with metadata and hashes
export const SceneCard = ({ scene }: SceneCardProps): ReactElement => {
  const releaseDateFormatted = dayjs(scene.releasedAt).format('MMM D, YYYY')
  const hasHashes = scene.hashes.length > 0

  return (
    <Card className="overflow-hidden p-0">
      <div className="aspect-video w-full overflow-hidden">
        <Image src={scene.imageUrl} alt={scene.title} width={300} height={169} className="h-full w-full object-cover" />
      </div>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div>
            <h3 className="line-clamp-2 leading-tight font-medium">{scene.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{releaseDateFormatted}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {hasHashes && (
              <Badge variant="secondary" className="text-xs">
                {scene.hashes.length} hash{scene.hashes.length !== 1 ? 'es' : ''}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
