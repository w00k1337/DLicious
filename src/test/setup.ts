import '@testing-library/jest-dom'

import React from 'react'
import { vi } from 'vitest'

// Mock server-only package to allow testing
vi.mock('server-only', () => ({}))

// Mock environment configuration
vi.mock('@/env/server', () => ({
  env: {
    LOG_LEVEL: 'silent',
    REDIS_HOST: 'localhost',
    REDIS_PORT: 6379,
    REDIS_USERNAME: 'default',
    REDIS_PASSWORD: undefined,
    STASH_BASE_URL: 'https://test-stash.example.com',
    STASH_API_KEY: 'test-api-key'
  }
}))

// Mock logger to avoid server-only issues
vi.mock('@/lib/logger', () => ({
  default: {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn()
  }
}))

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
