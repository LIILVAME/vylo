import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { canAttempt, recordSuccess, recordFailure, getState, reset } from '@/utils/circuitBreaker'

describe('circuitBreaker', () => {
  const endpoint = 'testEndpoint'

  beforeEach(() => {
    // Reset circuit breaker state
    reset(endpoint)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should allow requests when circuit is CLOSED', () => {
    const result = canAttempt(endpoint)
    expect(result.allowed).toBe(true)
  })

  it('should record failures and open circuit after threshold', () => {
    // Record failures up to threshold (5)
    for (let i = 0; i < 5; i++) {
      recordFailure(endpoint, new Error('Network error'))
    }

    const result = canAttempt(endpoint)
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('Circuit ouvert')

    const state = getState(endpoint)
    expect(state.state).toBe('OPEN')
    expect(state.failureCount).toBe(5)
  })

  it('should transition to HALF_OPEN after timeout', () => {
    // Open the circuit
    for (let i = 0; i < 5; i++) {
      recordFailure(endpoint, new Error('Network error'))
    }

    const stateBefore = getState(endpoint)
    expect(stateBefore.state).toBe('OPEN')
    expect(stateBefore.nextAttemptTime).toBeTruthy()

    // Fast-forward time to nextAttemptTime
    vi.advanceTimersByTime(60000) // 60 seconds

    const result = canAttempt(endpoint)
    expect(result.allowed).toBe(true)

    const stateAfter = getState(endpoint)
    expect(stateAfter.state).toBe('HALF_OPEN')
  })

  it('should close circuit after success in HALF_OPEN', () => {
    // Open circuit
    for (let i = 0; i < 5; i++) {
      recordFailure(endpoint, new Error('Network error'))
    }

    // Move to HALF_OPEN
    vi.advanceTimersByTime(60000)
    canAttempt(endpoint)

    // Record success
    recordSuccess(endpoint)

    const state = getState(endpoint)
    expect(state.state).toBe('CLOSED')
    expect(state.failureCount).toBe(0)
  })

  it('should reset failure count on success in CLOSED state', () => {
    // Record some failures
    recordFailure(endpoint, new Error('Network error'))
    recordFailure(endpoint, new Error('Network error'))

    expect(getState(endpoint).failureCount).toBe(2)

    // Record success
    recordSuccess(endpoint)

    expect(getState(endpoint).failureCount).toBe(0)
  })

  it('should reset circuit breaker manually', () => {
    // Open circuit
    for (let i = 0; i < 5; i++) {
      recordFailure(endpoint, new Error('Network error'))
    }

    expect(getState(endpoint).state).toBe('OPEN')

    // Reset
    reset(endpoint)

    const state = getState(endpoint)
    expect(state.state).toBe('CLOSED')
    expect(state.failureCount).toBe(0)
    expect(state.recentErrors).toBe(0)
  })

  it('should maintain error history within monitoring period', () => {
    // Record failures
    recordFailure(endpoint, new Error('Error 1'))
    recordFailure(endpoint, new Error('Error 2'))

    const state1 = getState(endpoint)
    expect(state1.recentErrors).toBeGreaterThanOrEqual(2)

    // Advance time but stay within monitoring period (60s)
    vi.advanceTimersByTime(30000)

    const state2 = getState(endpoint)
    expect(state2.recentErrors).toBeGreaterThanOrEqual(2)

    // Advance beyond monitoring period
    vi.advanceTimersByTime(35000)

    const state3 = getState(endpoint)
    // Errors should be cleaned up after monitoring period
    expect(state3.recentErrors).toBeLessThanOrEqual(state2.recentErrors)
  })
})
