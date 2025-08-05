import * as countryCodes from 'country-codes-list'
import dayjs from 'dayjs'
import { Calendar, Film, Globe, Heart, Users } from 'lucide-react'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ReactElement } from 'react'

import { Header } from '@/components/header'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { importPerformerScenesAction } from '@/lib/actions'
import prisma from '@/lib/prisma'

import { ImportScenesButton } from './import-scenes-button'
import { MonitorButton } from './monitor-button'
import { SceneCard } from './scene-card'

// AIDEV-NOTE: Dynamic page for individual performer details with full data display
export const dynamic = 'force-dynamic'

interface PerformerDetailPageProps {
  params: Promise<{ id: string }>
}

const PerformerDetailPage = async ({ params }: PerformerDetailPageProps): Promise<ReactElement> => {
  const { id } = await params
  const performer = await prisma.performer.findUnique({
    where: { id },
    select: {
      id: true,
      stashId: true,
      name: true,
      aliases: true,
      imageUrl: true,
      country: true,
      birthdate: true,
      cupSize: true,
      bandSize: true,
      hasNaturalBreasts: true,
      isFavorite: true,
      isMonitored: true,
      syncedAt: true,
      createdAt: true,
      updatedAt: true,
      scenes: {
        select: {
          id: true,
          title: true,
          imageUrl: true,
          releasedAt: true,
          stashId: true,
          stashDbId: true,
          hashes: {
            select: {
              type: true,
              value: true
            }
          }
        },
        orderBy: {
          releasedAt: 'desc'
        }
      }
    }
  })

  if (!performer) {
    notFound()
  }

  const age = performer.birthdate ? dayjs().diff(dayjs(performer.birthdate), 'year') : null
  const lastSyncFormatted = performer.syncedAt ? dayjs(performer.syncedAt).format('MMMM D, YYYY [at] h:mm A') : 'Never'

  const getCountryName = (countryCode: string | null): string | null => {
    if (!countryCode) return null
    try {
      const countryData = countryCodes.customList('countryCode', '{countryNameEn}')
      return countryData[countryCode.toUpperCase()] || countryCode
    } catch {
      return countryCode
    }
  }

  const countryName = getCountryName(performer.country)

  return (
    <>
      <Header breadcrumbs={[{ label: 'Performers', href: '/performers', icon: Users }, { label: performer.name }]} />
      <div className="space-y-6 p-6">
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="overflow-hidden p-0 md:col-span-1">
            <div className="aspect-auto w-full">
              <Image
                src={performer.imageUrl}
                alt={performer.name}
                width={400}
                height={400}
                className="h-full w-full object-cover"
              />
            </div>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold">{performer.name}</h1>

                  {performer.aliases.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Also known as:</p>
                      <div className="flex flex-wrap gap-1">
                        {performer.aliases.map((alias, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {alias}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {performer.isFavorite && (
                    <div className="flex items-center justify-center gap-2 rounded-lg bg-destructive/10 p-3 text-destructive">
                      <Heart className="h-4 w-4 fill-current" />
                      <span className="text-sm font-medium">Favorited</span>
                    </div>
                  )}

                  <MonitorButton performerId={performer.id} initialIsMonitored={performer.isMonitored} />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6 md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {countryName && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Country:</span>
                      <span className="font-medium">{countryName}</span>
                    </div>
                  )}

                  {performer.birthdate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Age:</span>
                      <span className="font-medium">
                        {age} years old
                        <span className="ml-1 text-sm text-muted-foreground">
                          (Born {dayjs(performer.birthdate).format('MMMM D, YYYY')})
                        </span>
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Physical Attributes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Breast Type</p>
                    {performer.hasNaturalBreasts !== null ? (
                      <Badge variant={performer.hasNaturalBreasts ? 'default' : 'secondary'}>
                        {performer.hasNaturalBreasts ? 'Natural' : 'Enhanced'}
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">Unknown</span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Band Size</p>
                    {performer.bandSize ? (
                      <Badge variant="outline">{performer.bandSize}</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">Unknown</span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Cup Size</p>
                    {performer.cupSize ? (
                      <Badge variant="outline">{performer.cupSize}</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">Unknown</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Film className="h-5 w-5" />
                    Scenes ({performer.scenes.length})
                  </div>
                  <form action={importPerformerScenesAction}>
                    <input type="hidden" name="stashId" value={performer.stashId} />
                    <ImportScenesButton />
                  </form>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {performer.scenes.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {performer.scenes.map(scene => (
                      <SceneCard key={scene.id} scene={scene} />
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <Film className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">No scenes found</p>
                    <p className="mt-1 text-sm text-muted-foreground">Import scenes for this performer from Stash</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Stash ID</p>
                    <p className="font-mono text-sm">{performer.stashId}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Last Sync</p>
                    <p className="text-sm">{lastSyncFormatted}</p>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4 text-xs text-muted-foreground sm:grid-cols-2">
                  <div>
                    <p>Added: {dayjs(performer.createdAt).format('MMMM D, YYYY')}</p>
                  </div>
                  <div>
                    <p>Updated: {dayjs(performer.updatedAt).format('MMMM D, YYYY')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}

export default PerformerDetailPage
