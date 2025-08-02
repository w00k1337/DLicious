'use client'

import * as AspectRatioPrimitive from '@radix-ui/react-aspect-ratio'
import { ReactElement } from 'react'

const AspectRatio = ({ ...props }: React.ComponentProps<typeof AspectRatioPrimitive.Root>): ReactElement => (
  <AspectRatioPrimitive.Root data-slot="aspect-ratio" {...props} />
)

export { AspectRatio }
