import { describe, it, expect, vi, beforeEach } from 'vitest'
import { retry, isRetryableError } from '@/utils/retry'

describe('retry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should succeed on first attempt', async () => {
    const fn = vi.fn().mockResolvedValue({ success: true, data: 'test' })

    const result = await retry(fn)

    expect(result.success).toBe(true)
    expect(result.data).toBe('test')
    expect(fn).toHaveBeenCalledTimes(1)
    expect(result.retries).toBe(0)
  })

  it('should retry on network error', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ success: true, data: 'test' })

    const result = await retry(fn, {
      maxRetries: 2,
      initialDelay: 10,
      shouldRetry: error => isRetryableError(error)
    })

    expect(result.success).toBe(true)
    expect(fn).toHaveBeenCalledTimes(2)
    expect(result.retries).toBe(1)
  })

  it('should fail after max retries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Network error'))

    const result = await retry(fn, {
      maxRetries: 2,
      initialDelay: 10,
      shouldRetry: error => isRetryableError(error)
    })

    expect(result.success).toBe(false)
    expect(fn).toHaveBeenCalledTimes(3) // 1 initial + 2 retries (attempts 0, 1, 2)
    expect(result.retries).toBe(3) // retries counter increments on each failed attempt
  })

  it('should not retry non-retryable errors', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Invalid input'))

    try {
      await retry(fn, {
        maxRetries: 2,
        shouldRetry: error => isRetryableError(error)
      })
    } catch (error) {
      expect(error.message).toBe('Invalid input')
    }

    expect(fn).toHaveBeenCalledTimes(1) // No retries
  })

  it('should handle success: false object', async () => {
    const fn = vi
      .fn()
      .mockResolvedValueOnce({
        success: false,
        error: new Error('Network error'),
        message: 'Network error'
      })
      .mockResolvedValueOnce({ success: true, data: 'test' })

    const result = await retry(fn, {
      maxRetries: 2,
      initialDelay: 10,
      // shouldRetry receives (result.error || result), so we need to handle both cases
      shouldRetry: errorOrResult => {
        const error = errorOrResult?.error || errorOrResult
        return error && isRetryableError(error)
      }
    })

    expect(result.success).toBe(true)
    expect(fn).toHaveBeenCalledTimes(2)
    expect(result.retries).toBeGreaterThan(0)
  })
})

describe('isRetryableError', () => {
  it('should identify network errors as retryable', () => {
    expect(isRetryableError(new Error('Network request failed'))).toBe(true)
    expect(isRetryableError(new Error('Failed to fetch'))).toBe(true)
    // Timeouts are NOT retryable (they indicate the request takes too long, not a temporary network issue)
    expect(isRetryableError(new Error('Connection timeout'))).toBe(false)
    expect(isRetryableError(new Error('Connection error'))).toBe(true)
  })

  it('should not identify validation errors as retryable', () => {
    expect(isRetryableError(new Error('Invalid input'))).toBe(false)
    expect(isRetryableError(new Error('Required field missing'))).toBe(false)
  })

  it('should handle null/undefined', () => {
    expect(isRetryableError(null)).toBe(false)
    expect(isRetryableError(undefined)).toBe(false)
  })
})
