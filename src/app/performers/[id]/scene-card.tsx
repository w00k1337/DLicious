import dayjs from 'dayjs'
import { Play } from 'lucide-react'
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
    isAvailableLocally: boolean
    hashes: {
      type: string
      value: string
    }[]
  }
}

// AIDEV-NOTE: Scene card component for displaying individual scenes with metadata and local availability
export const SceneCard = ({ scene }: SceneCardProps): ReactElement => {
  const releaseDateFormatted = dayjs(scene.releasedAt).format('MMM D, YYYY')

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
            {scene.isAvailableLocally && (
              <Badge variant="default" className="text-xs">
                <Play className="mr-1 h-3 w-3" />
                Available
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
