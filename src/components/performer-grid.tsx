import { ReactElement } from 'react'

import type { Performer } from '@/generated/prisma'

import { PerformerCard } from './performer-card'

interface PerformerGridProps {
  performers: Performer[]
}

export const PerformerGrid = ({ performers }: PerformerGridProps): ReactElement => {
  if (performers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-2 text-muted-foreground">No performers found</div>
        <div className="text-sm text-muted-foreground">Import performers from Stash to get started</div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {performers.map(performer => (
        <PerformerCard key={performer.id} performer={performer} />
      ))}
    </div>
  )
}
