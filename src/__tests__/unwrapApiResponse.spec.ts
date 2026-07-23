import { describe, expect, it } from 'vitest'
import { unwrapApiResponse } from '@/api/unwrapApiResponse'

describe('unwrapApiResponse', () => {
  it.each([
    ['false', false],
    ['zero', 0],
    ['empty string', ''],
    ['null', null],
  ])('preserves falsy envelope data: %s', (_label, value) => {
    expect(unwrapApiResponse({ code: 200, message: 'ok', data: value })).toBe(value)
  })

  it('returns a successful object payload', () => {
    expect(unwrapApiResponse({ code: 200, data: { id: 1 } })).toEqual({ id: 1 })
  })

  it('keeps non-success envelopes intact', () => {
    const payload = { code: 400, message: 'bad request', data: null }
    expect(unwrapApiResponse(payload)).toBe(payload)
  })
})
