import { ReactElement } from 'react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import prisma from '@/lib/prisma'

type FilterType = 'all' | 'monitored' | 'favorites'

interface PerformersTableProps {
  filter: FilterType
}

export const PerformersTable = async ({ filter }: PerformersTableProps): Promise<ReactElement> => {
  const whereClause = ((): Record<string, boolean> => {
    switch (filter) {
      case 'monitored':
        return { isMonitored: true }
      case 'favorites':
        return { isFavorite: true }
      default:
        return {}
    }
  })()

  const performers = await prisma.performer.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
      hasNaturalBreasts: true,
      bandSize: true,
      cupSize: true,
      isFavorite: true,
      isMonitored: true
    },
    orderBy: {
      name: 'asc'
    }
  })

  const getEmptyMessage = (): string => {
    switch (filter) {
      case 'monitored':
        return 'No monitored performers found. Start monitoring performers to see them here.'
      case 'favorites':
        return 'No favorite performers found. Mark performers as favorites to see them here.'
      default:
        return 'No performers found. Import performers to get started.'
    }
  }

  if (performers.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <p>{getEmptyMessage()}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Name</TableHead>
              <TableHead>Breast Type</TableHead>
              <TableHead>Band Size</TableHead>
              <TableHead>Cup Size</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {performers.map(performer => (
              <TableRow key={performer.id} className="hover:bg-muted/50">
                <TableCell className="pl-6 font-medium">{performer.name}</TableCell>
                <TableCell>
                  {performer.hasNaturalBreasts == null ? (
                    <span className="text-muted-foreground">-</span>
                  ) : (
                    <Badge variant={performer.hasNaturalBreasts ? 'default' : 'secondary'}>
                      {performer.hasNaturalBreasts ? 'Natural' : 'Enhanced'}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {performer.bandSize ? (
                    <Badge variant="outline">{performer.bandSize}</Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {performer.cupSize ? (
                    <Badge variant="outline">{performer.cupSize}</Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {performer.isFavorite && (
                      <Badge variant="destructive" className="text-xs">
                        Favorite
                      </Badge>
                    )}
                    {performer.isMonitored && (
                      <Badge variant="default" className="text-xs">
                        Monitored
                      </Badge>
                    )}
                    {!performer.isFavorite && !performer.isMonitored && (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
