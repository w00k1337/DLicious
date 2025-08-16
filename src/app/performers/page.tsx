import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import Link from 'next/link'
import { ReactElement } from 'react'

import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import prisma from '@/lib/prisma'

import { ImportButton } from './import-button'

dayjs.extend(relativeTime)

// AIDEV-TODO: This is a simple overview page that needs to be refactored and improved in the future
const PerformersPage = async (): Promise<ReactElement> => {
  const performers = await prisma.performer.findMany({
    include: {
      _count: {
        select: { scenes: true }
      }
    },
    orderBy: { name: 'asc' }
  })

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Performers</h1>
            <p className="text-muted-foreground">Manage and monitor your favorite performers</p>
          </div>
          <ImportButton />
        </div>
      </div>

      <Table>
        <TableCaption>A list of all performers in the database</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="text-center">Scenes</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead>Last Synced</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {performers.map(performer => (
            <TableRow key={performer.id}>
              <TableCell className="font-medium">
                <Link href={`/performers/${performer.id}`}>
                  <div>{performer.name}</div>
                </Link>
              </TableCell>
              <TableCell className="text-center">{performer._count.scenes}</TableCell>
              <TableCell className="space-x-2 text-center">
                {performer.isMonitored && <Badge variant="default">Monitored</Badge>}
                {performer.isFavorite && <Badge variant="secondary">Favorite</Badge>}
              </TableCell>
              <TableCell>{performer.syncedAt ? dayjs(performer.syncedAt).fromNow() : 'Never'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export default PerformersPage
