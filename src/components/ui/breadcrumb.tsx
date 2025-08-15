import { Slot } from '@radix-ui/react-slot'
import { ChevronRight, MoreHorizontal } from 'lucide-react'
import { ComponentProps, ReactElement } from 'react'

import { cn } from '@/lib/utils'

const Breadcrumb = ({ ...props }: ComponentProps<'nav'>): ReactElement => (
  <nav aria-label="breadcrumb" data-slot="breadcrumb" {...props} />
)

const BreadcrumbList = ({ className, ...props }: ComponentProps<'ol'>): ReactElement => (
  <ol
    data-slot="breadcrumb-list"
    className={cn(
      'flex flex-wrap items-center gap-1.5 text-sm break-words text-muted-foreground sm:gap-2.5',
      className
    )}
    {...props}
  />
)

const BreadcrumbItem = ({ className, ...props }: ComponentProps<'li'>): ReactElement => (
  <li data-slot="breadcrumb-item" className={cn('inline-flex items-center gap-1.5', className)} {...props} />
)

const BreadcrumbLink = ({
  asChild,
  className,
  ...props
}: ComponentProps<'a'> & { asChild?: boolean }): ReactElement => {
  const Comp = asChild ? Slot : 'a'

  return (
    <Comp data-slot="breadcrumb-link" className={cn('transition-colors hover:text-foreground', className)} {...props} />
  )
}

const BreadcrumbPage = ({ className, ...props }: ComponentProps<'span'>): ReactElement => (
  <span
    data-slot="breadcrumb-page"
    role="link"
    aria-disabled="true"
    aria-current="page"
    className={cn('font-normal text-foreground', className)}
    {...props}
  />
)

const BreadcrumbSeparator = ({ children, className, ...props }: ComponentProps<'li'>): ReactElement => (
  <li
    data-slot="breadcrumb-separator"
    role="presentation"
    aria-hidden="true"
    className={cn('[&>svg]:size-3.5', className)}
    {...props}
  >
    {children ?? <ChevronRight />}
  </li>
)

const BreadcrumbEllipsis = ({ className, ...props }: ComponentProps<'span'>): ReactElement => (
  <span
    data-slot="breadcrumb-ellipsis"
    role="presentation"
    aria-hidden="true"
    className={cn('flex size-9 items-center justify-center', className)}
    {...props}
  >
    <MoreHorizontal className="size-4" />
    <span className="sr-only">More</span>
  </span>
)

export {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
}
