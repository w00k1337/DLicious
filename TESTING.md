# Testing Guide

This project uses **Vitest** for testing with **React Testing Library** for component testing.

## Setup

The testing environment is configured with:

- **Vitest** - Fast test runner
- **React Testing Library** - Component testing utilities
- **jsdom** - DOM environment for testing
- **@testing-library/jest-dom** - Custom matchers for DOM testing

## Running Tests

```bash
# Run tests in watch mode
pnpm test

# Run tests once
pnpm test:run

# Run tests with UI (if @vitest/ui is installed)
pnpm test:ui
```

## Test Structure

### Component Tests

Component tests are located in `__tests__` directories next to the components they test:

```
src/app/
├── __tests__/
│   ├── page.test.tsx      # Tests for HomePage component
│   ├── layout.test.tsx    # Tests for RootLayout component
│   └── metadata.test.ts   # Tests for metadata configuration
├── page.tsx
└── layout.tsx
```

### Utility Tests

Utility function tests are organized in `__tests__` directories:

```
src/utils/
├── __tests__/
│   └── example.test.ts    # Example utility function tests
└── ...

src/lib/
├── __tests__/
│   └── validation.test.ts # Zod validation tests
└── ...
```

## Testing Patterns

### Component Testing

```typescript
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import MyComponent from '../MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('has correct styling', () => {
    render(<MyComponent />)
    const element = screen.getByRole('button')
    expect(element).toHaveClass('btn', 'btn-primary')
  })
})
```

### Utility Function Testing

```typescript
import { describe, expect, it } from 'vitest'

import { formatCurrency } from '../utils'

describe('formatCurrency', () => {
  it('formats USD correctly', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56')
  })

  it('handles edge cases', () => {
    expect(formatCurrency(0)).toBe('$0.00')
    expect(formatCurrency(-100)).toBe('-$100.00')
  })
})
```

### Zod Validation Testing

```typescript
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

const UserSchema = z.object({
  email: z.email(),
  name: z.string().min(1)
})

describe('UserSchema', () => {
  it('validates correct data', () => {
    const result = UserSchema.safeParse({
      email: 'test@example.com',
      name: 'John Doe'
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid data', () => {
    const result = UserSchema.safeParse({
      email: 'invalid-email',
      name: ''
    })
    expect(result.success).toBe(false)
  })
})
```

## Best Practices

1. **Test Behavior, Not Implementation**: Focus on what the component does, not how it does it
2. **Use Semantic Queries**: Prefer `getByRole`, `getByLabelText` over `getByTestId`
3. **Test Accessibility**: Ensure components work with screen readers and keyboard navigation
4. **Test Error States**: Always test error handling and edge cases
5. **Keep Tests Simple**: Each test should verify one specific behavior
6. **Use Descriptive Test Names**: Test names should clearly describe what is being tested

## Mocking

### Next.js Router

```typescript
// Already configured in src/test/setup.ts
import { useRouter } from 'next/navigation'

// In your component
const router = useRouter()
router.push('/new-page') // This is mocked in tests
```

### Next.js Image Component

```typescript
// Already configured in src/test/setup.ts
import Image from 'next/image'

// In your component
<Image src="/logo.png" alt="Logo" /> // Renders as <img> in tests
```

## Future Testing Considerations

As the app grows, consider adding:

1. **Integration Tests**: Test complete user flows
2. **API Tests**: Test API endpoints and data fetching
3. **E2E Tests**: Use Playwright or Cypress for end-to-end testing
4. **Performance Tests**: Test component rendering performance
5. **Visual Regression Tests**: Ensure UI doesn't break visually

## Troubleshooting

### CSS Parsing Warnings

The CSS parsing warnings from Tailwind CSS v4 are expected and don't affect test functionality.

### Hydration Errors

If you see hydration errors, ensure your components handle server/client rendering differences properly.

### Test Environment Issues

If tests fail due to missing globals, check that `src/test/setup.ts` is properly configured.
