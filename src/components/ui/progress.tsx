'use client'

import * as ProgressPrimitive from '@radix-ui/react-progress'
import { ComponentProps, ReactElement } from 'react'

import { cn } from '@/lib/utils'

const Progress = ({ className, value, ...props }: ComponentProps<typeof ProgressPrimitive.Root>): ReactElement => (
  <ProgressPrimitive.Root
    data-slot="progress"
    className={cn('relative h-2 w-full overflow-hidden rounded-full bg-primary/20', className)}
    {...props}
  >
    <ProgressPrimitive.Indicator
      data-slot="progress-indicator"
      className="h-full w-full flex-1 bg-primary transition-all"
      style={{ transform: `translateX(-${String(100 - (value ?? 0))}%)` }}
    />
  </ProgressPrimitive.Root>
)

export { Progress }
