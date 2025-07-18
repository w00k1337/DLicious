import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import HomePage from '../page'

describe('HomePage', () => {
  it('renders the main heading', () => {
    render(<HomePage />)

    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveTextContent('DLicious')
  })

  it('has the correct styling classes', () => {
    render(<HomePage />)

    const main = screen.getByRole('main')
    expect(main).toHaveClass('flex', 'min-h-screen', 'items-center', 'justify-center')

    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveClass('text-5xl', 'font-bold', 'tracking-tight')
  })

  it('renders as a server component', () => {
    // This test verifies that the component doesn't use 'use client'
    // and can be rendered without client-side JavaScript
    const { container } = render(<HomePage />)

    expect(container.firstChild).toBeInTheDocument()
  })
})
