import { describe, expect, it } from 'vitest'
import { z } from 'zod'

// Example schemas for demonstration
const UserSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  name: z.string().min(1).max(100),
  age: z.number().int().min(0).max(120).optional(),
  isActive: z.boolean().default(true)
})

const ProductSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(200),
  price: z.number().positive(),
  category: z.enum(['food', 'drink', 'dessert']),
  tags: z.array(z.string()).optional()
})

describe('Zod Validation', () => {
  describe('UserSchema', () => {
    it('validates correct user data', () => {
      const validUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        name: 'John Doe',
        age: 30,
        isActive: true
      }

      const result = UserSchema.safeParse(validUser)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(validUser)
      }
    })

    it('rejects invalid email', () => {
      const invalidUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'invalid-email',
        name: 'John Doe'
      }

      const result = UserSchema.safeParse(invalidUser)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues).toHaveLength(1)
        expect(result.error.issues[0].path).toEqual(['email'])
      }
    })

    it('rejects invalid UUID', () => {
      const invalidUser = {
        id: 'invalid-uuid',
        email: 'test@example.com',
        name: 'John Doe'
      }

      const result = UserSchema.safeParse(invalidUser)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues).toHaveLength(1)
        expect(result.error.issues[0].path).toEqual(['id'])
      }
    })

    it('applies default values', () => {
      const userWithoutDefaults = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        name: 'John Doe'
      }

      const result = UserSchema.parse(userWithoutDefaults)
      expect(result.isActive).toBe(true)
    })
  })

  describe('ProductSchema', () => {
    it('validates correct product data', () => {
      const validProduct = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Delicious Pizza',
        price: 15.99,
        category: 'food' as const,
        tags: ['italian', 'cheese']
      }

      const result = ProductSchema.safeParse(validProduct)
      expect(result.success).toBe(true)
    })

    it('rejects invalid category', () => {
      const invalidProduct = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Delicious Pizza',
        price: 15.99,
        category: 'invalid-category'
      }

      const result = ProductSchema.safeParse(invalidProduct)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues).toHaveLength(1)
        expect(result.error.issues[0].path).toEqual(['category'])
      }
    })

    it('rejects negative price', () => {
      const invalidProduct = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Delicious Pizza',
        price: -15.99,
        category: 'food' as const
      }

      const result = ProductSchema.safeParse(invalidProduct)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues).toHaveLength(1)
        expect(result.error.issues[0].path).toEqual(['price'])
      }
    })
  })
})
