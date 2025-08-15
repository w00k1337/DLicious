'use client'

import { Command as CommandPrimitive } from 'cmdk'
import { SearchIcon } from 'lucide-react'
import { ComponentProps, ReactElement } from 'react'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const Command = ({ className, ...props }: ComponentProps<typeof CommandPrimitive>): ReactElement => (
  <CommandPrimitive
    data-slot="command"
    className={cn(
      'flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground',
      className
    )}
    {...props}
  />
)

const CommandDialog = ({
  title = 'Command Palette',
  description = 'Search for a command to run...',
  children,
  className,
  showCloseButton = true,
  ...props
}: ComponentProps<typeof Dialog> & {
  title?: string
  description?: string
  className?: string
  showCloseButton?: boolean
}): ReactElement => (
  <Dialog {...props}>
    <DialogHeader className="sr-only">
      <DialogTitle>{title}</DialogTitle>
      <DialogDescription>{description}</DialogDescription>
    </DialogHeader>
    <DialogContent className={cn('overflow-hidden p-0', className)} showCloseButton={showCloseButton}>
      <Command className="**:data-[slot=command-input-wrapper]:h-12 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]]:px-2 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
        {children}
      </Command>
    </DialogContent>
  </Dialog>
)

const CommandInput = ({ className, ...props }: ComponentProps<typeof CommandPrimitive.Input>): ReactElement => (
  <div data-slot="command-input-wrapper" className="flex h-9 items-center gap-2 border-b px-3">
    <SearchIcon className="size-4 shrink-0 opacity-50" />
    <CommandPrimitive.Input
      data-slot="command-input"
      className={cn(
        'flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  </div>
)

const CommandList = ({ className, ...props }: ComponentProps<typeof CommandPrimitive.List>): ReactElement => (
  <CommandPrimitive.List
    data-slot="command-list"
    className={cn('max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto', className)}
    {...props}
  />
)

const CommandEmpty = ({ ...props }: ComponentProps<typeof CommandPrimitive.Empty>): ReactElement => (
  <CommandPrimitive.Empty data-slot="command-empty" className="py-6 text-center text-sm" {...props} />
)

const CommandGroup = ({ className, ...props }: ComponentProps<typeof CommandPrimitive.Group>): ReactElement => (
  <CommandPrimitive.Group
    data-slot="command-group"
    className={cn(
      'overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground',
      className
    )}
    {...props}
  />
)

const CommandSeparator = ({ className, ...props }: ComponentProps<typeof CommandPrimitive.Separator>): ReactElement => (
  <CommandPrimitive.Separator
    data-slot="command-separator"
    className={cn('-mx-1 h-px bg-border', className)}
    {...props}
  />
)

const CommandItem = ({ className, ...props }: ComponentProps<typeof CommandPrimitive.Item>): ReactElement => (
  <CommandPrimitive.Item
    data-slot="command-item"
    className={cn(
      "relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground",
      className
    )}
    {...props}
  />
)

const CommandShortcut = ({ className, ...props }: ComponentProps<'span'>): ReactElement => (
  <span
    data-slot="command-shortcut"
    className={cn('ml-auto text-xs tracking-widest text-muted-foreground', className)}
    {...props}
  />
)

export {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut
}
