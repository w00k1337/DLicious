import { ReactElement } from 'react'

import { cn } from '@/lib/utils'

const Skeleton = ({ className, ...props }: React.ComponentProps<'div'>): ReactElement => (
  <div data-slot="skeleton" className={cn('animate-pulse rounded-md bg-accent', className)} {...props} />
)

export { Skeleton }
