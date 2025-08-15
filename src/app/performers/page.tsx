import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import Link from 'next/link'
import { ReactElement } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import prisma from '@/lib/prisma'

dayjs.extend(relativeTime)

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
        <h1 className="text-3xl font-bold">Performers</h1>
        <p className="text-muted-foreground">Manage and monitor your favorite performers</p>
      </div>

      <Table>
        <TableCaption>A list of all performers in the database</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="text-center">Scenes</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead>Last Synced</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {performers.map(performer => (
            <TableRow key={performer.id}>
              <TableCell className="font-medium">
                <div>{performer.name}</div>
              </TableCell>
              <TableCell className="text-center">{performer._count.scenes}</TableCell>
              <TableCell className="space-x-2 text-center">
                {performer.isMonitored && <Badge variant="default">Monitored</Badge>}
                {performer.isFavorite && <Badge variant="secondary">Favorite</Badge>}
              </TableCell>
              <TableCell>{performer.syncedAt ? dayjs(performer.syncedAt).fromNow() : 'Never'}</TableCell>
              <TableCell className="text-right">
                <Link href={`/performers/${performer.id}`}>
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export default PerformersPage
