import { Bell } from 'lucide-react'
import { ReactElement } from 'react'

import { Button } from '@/components/ui/button'

export const Header = (): ReactElement => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center space-x-4">{/* Left side content can be added here */}</div>

        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-4 w-4" />
            <span className="sr-only">Notifications</span>
            {/* AIDEV-NOTE: Dropdown menu functionality can be added once shadcn dropdown-menu is properly configured */}
            {/* AIDEV-NOTE: Badge for notification count can be added here */}
            {/* <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs">3</Badge> */}
          </Button>
        </div>
      </div>
    </header>
  )
}
