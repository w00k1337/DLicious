import { ReactElement } from 'react'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import prisma from '@/lib/prisma'

const PerformersPage = async (): Promise<ReactElement> => {
  const performers = await prisma.performer.findMany({
    select: {
      id: true,
      name: true,
      hasNaturalBreasts: true,
      bandSize: true,
      cupSize: true,
      isFavorite: true,
      isMonitored: true
    }
  })

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Breast Type</TableHead>
          <TableHead>Band Size</TableHead>
          <TableHead>Cup Size</TableHead>
          <TableHead>Favorite</TableHead>
          <TableHead>Monitored</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {performers.map(p => (
          <TableRow key={p.id}>
            <TableCell>{p.name}</TableCell>
            <TableCell>{p.hasNaturalBreasts == null ? '-' : p.hasNaturalBreasts ? 'Natural' : 'Fake'}</TableCell>
            <TableCell>{p.bandSize ?? '-'}</TableCell>
            <TableCell>{p.cupSize ?? '-'}</TableCell>
            <TableCell>{p.isFavorite ? 'Yes' : 'No'}</TableCell>
            <TableCell>{p.isMonitored ? 'Yes' : 'No'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export default PerformersPage
