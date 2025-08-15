import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ReactElement } from 'react'

import { AspectRatio } from '@/components/ui/aspect-ratio'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import prisma from '@/lib/prisma'

import { PerformerActions } from './performer-actions'

dayjs.extend(relativeTime)

interface PerformerDetailPageProps {
  params: Promise<{
    id: string
  }>
}

const PerformerDetailPage = async ({ params }: PerformerDetailPageProps): Promise<ReactElement> => {
  const { id } = await params
  const performer = await prisma.performer.findUnique({
    where: { id },
    include: {
      scenes: {
        orderBy: { releasedAt: 'desc' }
      }
    }
  })

  if (!performer) {
    notFound()
  }

  return (
    <div className="space-y-6">
      {/* AIDEV-NOTE: Performer header section with image and basic info */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="md:col-span-1">
          {performer.imageUrl ? (
            <AspectRatio ratio={3 / 4}>
              <Image src={performer.imageUrl} alt={performer.name} fill className="rounded-lg object-cover" />
            </AspectRatio>
          ) : (
            <AspectRatio ratio={3 / 4}>
              <div className="flex h-full w-full items-center justify-center rounded-lg bg-muted">
                <span className="text-muted-foreground">No image</span>
              </div>
            </AspectRatio>
          )}
        </div>

        <div className="space-y-4 md:col-span-2">
          <div>
            <h1 className="text-4xl font-bold">{performer.name}</h1>
            {performer.aliases.length > 0 && (
              <p className="mt-1 text-muted-foreground">Also known as: {performer.aliases.join(', ')}</p>
            )}
          </div>

          <div className="flex gap-2">
            {performer.isMonitored && <Badge variant="default">Monitored</Badge>}
            {performer.isFavorite && <Badge variant="secondary">Favorite</Badge>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Country</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{performer.country ?? 'Unknown'}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Birth Date</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {performer.birthdate ? dayjs(performer.birthdate).format('MMM D, YYYY') : 'Unknown'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Measurements</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {performer.cupSize && performer.bandSize
                    ? `${performer.bandSize.toString()}${performer.cupSize}`
                    : 'Unknown'}
                  {performer.hasNaturalBreasts !== null && (
                    <span className="ml-2 text-sm text-muted-foreground">
                      ({performer.hasNaturalBreasts ? 'Natural' : 'Enhanced'})
                    </span>
                  )}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Last Synced</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {performer.syncedAt ? dayjs(performer.syncedAt).fromNow() : 'Never'}
                </p>
              </CardContent>
            </Card>
          </div>

          <PerformerActions
            performerId={performer.id}
            isMonitored={performer.isMonitored}
            isFavorite={performer.isFavorite}
          />
        </div>
      </div>

      {/* AIDEV-NOTE: Scenes section showing all scenes for this performer */}
      <div>
        <h2 className="mb-4 text-2xl font-bold">Scenes ({performer.scenes.length})</h2>

        {performer.scenes.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {performer.scenes.map(scene => (
              <Card key={scene.id} className="overflow-hidden">
                {scene.imageUrl ? (
                  <AspectRatio ratio={16 / 9}>
                    <Image src={scene.imageUrl} alt={scene.title} fill className="object-cover" />
                  </AspectRatio>
                ) : (
                  <AspectRatio ratio={16 / 9}>
                    <div className="flex h-full w-full items-center justify-center bg-muted">
                      <span className="text-sm text-muted-foreground">No image</span>
                    </div>
                  </AspectRatio>
                )}
                <CardHeader className="p-4">
                  <CardTitle className="line-clamp-2 text-sm">{scene.title}</CardTitle>
                  <CardDescription>{dayjs(scene.releasedAt).format('MMM D, YYYY')}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No scenes found for this performer</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default PerformerDetailPage
