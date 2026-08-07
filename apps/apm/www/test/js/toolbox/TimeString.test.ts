import {describe, expect, it} from 'vitest'
import {TimeString} from '@/toolbox/TimeString'

describe('TimeString', () => {
  describe('toJsTimeStamp', () => {
    it('converts a time string to a UTC timestamp', () => {
      expect(TimeString.toJsTimeStamp('2023-04-01 12:34:56.123456'))
        .toBe(Date.UTC(2023, 3, 1, 12, 34, 56, 123))
    })

    it('rounds microseconds to the nearest millisecond', () => {
      expect(TimeString.toJsTimeStamp('2023-04-01 12:34:56.123499'))
        .toBe(Date.UTC(2023, 3, 1, 12, 34, 56, 123))
      expect(TimeString.toJsTimeStamp('2023-04-01 12:34:56.123500'))
        .toBe(Date.UTC(2023, 3, 1, 12, 34, 56, 124))
    })
  })

  describe('toDate', () => {
    it('returns a Date for the converted UTC timestamp', () => {
      expect(TimeString.toDate('1970-01-01 00:00:01.500000'))
        .toEqual(new Date(Date.UTC(1970, 0, 1, 0, 0, 1, 500)))
    })
  })

  describe('isValid', () => {
    it('accepts valid normal and compact time strings', () => {
      expect(TimeString.isValid('2023-04-01 12:34:56.123456')).toBe(true)
      expect(TimeString.isValid('20230401123456123456')).toBe(true)
    })

    it('rejects strings with an invalid format', () => {
      expect(TimeString.isValid('2023-4-01 12:34:56.123456')).toBe(false)
      expect(TimeString.isValid('2023-04-01T12:34:56.123456')).toBe(false)
      expect(TimeString.isValid('2023040112345612345')).toBe(false)
      expect(TimeString.isValid('202304011234561234567')).toBe(false)
      expect(TimeString.isValid('2023-04-01 12:34:56.12345a')).toBe(false)
    })

    it('rejects components outside their supported ranges', () => {
      const invalidTimeStrings = [
        '0000-01-01 00:00:00.000000',
        '2023-00-01 00:00:00.000000',
        '2023-13-01 00:00:00.000000',
        '2023-01-00 00:00:00.000000',
        '2023-01-32 00:00:00.000000',
        '2023-01-01 24:00:00.000000',
        '2023-01-01 00:60:00.000000',
        '2023-01-01 00:00:60.000000',
        '2023-01-01 00:00:00.1000000',
      ]

      for (const timeString of invalidTimeStrings) {
        expect(TimeString.isValid(timeString), timeString).toBe(false)
      }

      expect(TimeString.isValid('20231332000000999999')).toBe(false)
    })

    it('validates the number of days in a particular month', () => {
      const invalidDates = [
        '2023-02-29 00:00:00.000000',
        '2023-04-31 00:00:00.000000',
        '2023-06-31 00:00:00.000000',
        '2023-09-31 00:00:00.000000',
        '2023-11-31 00:00:00.000000',
      ]

      for (const timeString of invalidDates) {
        expect(TimeString.isValid(timeString), timeString).toBe(false)
      }

      expect(TimeString.isValid('2024-02-29 00:00:00.000000')).toBe(true)
      expect(TimeString.isValid('2000-02-29 00:00:00.000000')).toBe(true)
      expect(TimeString.isValid('1900-02-29 00:00:00.000000')).toBe(false)
    })
  })

  describe('compactEncode', () => {
    it('removes formatting characters from a normal time string', () => {
      expect(TimeString.compactEncode('2023-04-01 12:34:56.123456'))
        .toBe('20230401123456123456')
    })

    it('removes all occurrences of supported formatting characters', () => {
      expect(TimeString.compactEncode(' 2023 - 04 - 01  12:34:56.123.456 '))
        .toBe('20230401123456123456')
    })

    it('does not check the validity of the input components', () => {
      expect(TimeString.compactEncode('2023-99-99 99:99:99.999999'))
        .toBe('20239999999999999999')
    })

    it('does not require the input to have a time string shape', () => {
      expect(TimeString.compactEncode('not a time')).toBe('notatime')
    })
  })

  describe('compactDecode', () => {
    it('expands a compact time string into the normal representation', () => {
      expect(TimeString.compactDecode('20230401123456123456'))
        .toBe('2023-04-01 12:34:56.123456')
    })

    it('does not check the validity of decoded components', () => {
      expect(TimeString.compactDecode('20231332000000999999'))
        .toBe('2023-13-32 00:00:00.999999')
    })

    it('throws for input that is not a 20-character all-digit string', () => {
      expect(() => TimeString.compactDecode('2023040112345612345'))
        .toThrow('Invalid time string format: 2023040112345612345')
      expect(() => TimeString.compactDecode('2023-04-01 12:34:56.123456'))
        .toThrow('Invalid time string format: 2023-04-01 12:34:56.123456')
      expect(() => TimeString.compactDecode('2023040112345612345a'))
        .toThrow('Invalid time string format: 2023040112345612345a')
    })
  })
})