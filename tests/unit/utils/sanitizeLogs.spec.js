import { describe, it, expect } from 'vitest'
import {
  maskId,
  maskEmail,
  maskToken,
  sanitizeUser,
  sanitizeSession,
  sanitizeObject
} from '@/utils/sanitizeLogs'

describe('sanitizeLogs', () => {
  describe('maskId', () => {
    it('should mask UUID correctly', () => {
      const id = '5d7b4a1c-f983-43d8-87c1-613a72509706'
      const masked = maskId(id)
      expect(masked).toBe('5d7b4a1c-****')
      expect(masked).not.toContain('f983')
    })

    it('should handle short IDs', () => {
      expect(maskId('123')).toBe('***')
      expect(maskId('')).toBe('***')
      expect(maskId(null)).toBe('***')
    })
  })

  describe('maskEmail', () => {
    it('should mask email correctly', () => {
      expect(maskEmail('test@example.com')).toBe('te**@example.com')
      expect(maskEmail('user@domain.co')).toBe('us**@domain.co')
    })

    it('should handle short emails', () => {
      expect(maskEmail('ab@example.com')).toBe('**@example.com')
      expect(maskEmail('a@example.com')).toBe('**@example.com')
    })

    it('should handle invalid emails', () => {
      expect(maskEmail('')).toBe('***')
      expect(maskEmail(null)).toBe('***')
      expect(maskEmail('invalid')).toBe('***')
    })
  })

  describe('maskToken', () => {
    it('should mask token correctly', () => {
      const token =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'
      const masked = maskToken(token)
      expect(masked).toBe('eyJhbGciOiJIUzI1NiIs...')
      expect(masked.length).toBeLessThan(token.length)
    })

    it('should handle short tokens', () => {
      expect(maskToken('abc')).toBe('***')
      expect(maskToken('')).toBe('***')
      expect(maskToken(null)).toBe('***')
    })
  })

  describe('sanitizeUser', () => {
    it('should sanitize user object', () => {
      const user = {
        id: '5d7b4a1c-f983-43d8-87c1-613a72509706',
        email: 'test@example.com',
        phone: '1234567890',
        avatar_url: 'https://example.com/avatar.jpg'
      }

      const sanitized = sanitizeUser(user)

      expect(sanitized.id).toBe('5d7b4a1c-****')
      expect(sanitized.email).toBe('te**@example.com')
      expect(sanitized.phone).toBeUndefined()
      expect(sanitized.avatar_url).toBeUndefined()
    })

    it('should handle null user', () => {
      expect(sanitizeUser(null)).toBeNull()
      expect(sanitizeUser(undefined)).toBeNull()
    })
  })

  describe('sanitizeSession', () => {
    it('should sanitize session object', () => {
      const session = {
        access_token: 'eyJhbGciOiJIUzI1NiIs...',
        refresh_token: 'refresh_token_value',
        user: {
          id: '5d7b4a1c-f983-43d8-87c1-613a72509706',
          email: 'test@example.com'
        },
        expires_at: 1234567890
      }

      const sanitized = sanitizeSession(session)

      expect(sanitized.access_token).toBe('eyJhbGciOiJIUzI1NiIs...')
      expect(sanitized.refresh_token).toContain('...')
      expect(sanitized.user.id).toBe('5d7b4a1c-****')
      expect(sanitized.user.email).toBe('te**@example.com')
      expect(sanitized.expires_at).toBe(1234567890)
    })
  })

  describe('sanitizeObject', () => {
    it('should sanitize sensitive keys', () => {
      const obj = {
        password: 'secret123',
        api_key: 'key_value',
        email: 'test@example.com',
        user_id: '5d7b4a1c-f983-43d8-87c1-613a72509706',
        safeField: 'safe_value'
      }

      const sanitized = sanitizeObject(obj)

      expect(sanitized.password).toBe('***')
      expect(sanitized.api_key).toContain('...')
      expect(sanitized.email).toBe('te**@example.com')
      expect(sanitized.user_id).toBe('5d7b4a1c-****')
      expect(sanitized.safeField).toBe('safe_value')
    })

    it('should handle custom sensitive keys', () => {
      const obj = {
        customSecret: 'secret_value',
        publicData: 'public_value'
      }

      const sanitized = sanitizeObject(obj, ['customSecret'])

      expect(sanitized.customSecret).toBe('***')
      expect(sanitized.publicData).toBe('public_value')
    })
  })
})
