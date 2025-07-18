import '@testing-library/jest-dom'

import React from 'react'
import { vi } from 'vitest'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: (): {
    push: ReturnType<typeof vi.fn>
    replace: ReturnType<typeof vi.fn>
    prefetch: ReturnType<typeof vi.fn>
    back: ReturnType<typeof vi.fn>
    forward: ReturnType<typeof vi.fn>
    refresh: ReturnType<typeof vi.fn>
  } => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn()
  }),
  useSearchParams: (): URLSearchParams => new URLSearchParams(),
  usePathname: (): string => '/'
}))

// Mock Next.js image component
vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>): React.ReactElement => {
    return React.createElement('img', props)
  }
}))
