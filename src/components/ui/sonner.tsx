'use client'

import { useTheme } from 'next-themes'
import { CSSProperties, ReactElement } from 'react'
import { Toaster as Sonner, ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps): ReactElement => {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={theme === 'system' || theme === 'dark' || theme === 'light' ? theme : 'system'}
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)'
        } as CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
