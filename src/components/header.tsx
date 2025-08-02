import { ReactElement } from 'react'

export const Header = (): ReactElement => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* AIDEV-TODO: Add notification bell to the far right. The bell should be a button that toggles a dropdown menu with the notifications. */}
    </header>
  )
}
