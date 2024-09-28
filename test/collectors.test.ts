import { describe, expect, mock, spyOn, test } from 'bun:test'
import { type Collector, Collectors, collector, sequenceOf } from '../src'

describe('collectors', () => {
  test('collector factory should be an identity', () => {
    const c = collector<number, number>({
      supplier() {
        return 0
      },
      accumulator(acc, item) {
        return acc + item
      },
    })

    expect(c).toBe(c)
  })

  test('a sequence cannot be collected twice', () => {
    const s = sequenceOf([1, 2, 3])
    const c = collector<number, number>({
      supplier() {
        return 0
      },
      accumulator(acc, item) {
        return acc + item
      },
    })
    const accumulator = spyOn(c, 'accumulator')
    const collect = mock(<A, C>(c: Collector<number, A, C>) => s.collect(c))
    expect(collect).toHaveBeenCalledTimes(0)
    expect(accumulator).toHaveBeenCalledTimes(0)
    collect(c)
    expect(collect).toHaveBeenCalledTimes(1)
    expect(accumulator).toHaveBeenCalledTimes(3)
    expect(() => collect(c)).toThrow(/consumed/i)
    expect(collect).toHaveBeenCalledTimes(2)
    expect(accumulator).toHaveBeenCalledTimes(3)
  })

  test('collectors should be able to be used with sequence.collect', () => {
    const s = sequenceOf([1, 2, 3])
    const c = collector<number, number>({
      supplier() {
        return 0
      },
      accumulator(acc, item) {
        return acc + item
      },
    })
    const result = s.collect(c)
    expect(result).toBe(6)
  })

  test('collectors should be able to be finished', () => {
    const s = sequenceOf([1, 2, 3])
    const c = collector<number, number>({
      supplier() {
        return 0
      },
      accumulator(acc, item) {
        return acc + item
      },
      finisher(acc) {
        return acc * 2
      },
    })
    const result = s.collect(c)
    expect(result).toBe(12)
  })
})

describe('built-in collectors', () => {
  test('Collectors.toArray should collect all items into an array', () => {
    const s = sequenceOf([1, 2, 3])
    const result = s.collect(Collectors.toArray())
    expect(result).toEqual([1, 2, 3])
  })

  test('Collectors.toArray should collect no items into an empty array', () => {
    const s = sequenceOf([])
    const result = s.collect(Collectors.toArray())
    expect(result).toEqual([])
  })

  test('Collectors.toSet should collect all items into a set', () => {
    const s = sequenceOf([1, 2, 3])
    const result = s.collect(Collectors.toSet())
    expect(result).toEqual(new Set([1, 2, 3]))
  })

  test('Collectors.toSet should collect no items into an empty set', () => {
    const s = sequenceOf([])
    const result = s.collect(Collectors.toSet())
    expect(result).toEqual(new Set())
  })

  test('Collectors.toObject should collect all items into an object', () => {
    const s = sequenceOf<[string, number]>([
      ['a', 1],
      ['b', 2],
      ['c', 3],
    ])
    const result = s.collect(Collectors.toObject())
    expect(result).toEqual({ a: 1, b: 2, c: 3 })
  })

  test('Collectors.toObject should collect no items into an empty object', () => {
    const s = sequenceOf([])
    const result = s.collect(Collectors.toObject())
    expect(result).toEqual({})
  })

  test('Collectors.toObject should not be able to collect non-pair-like items', () => {
    const s = sequenceOf([1, 2, 3])
    // @ts-expect-error
    expect(() => s.collect(Collectors.toObject())).toThrow(/pair/i)
  })

  test('Collectors.toObject should not be able to collect items with non-string/number/symbol keys', () => {
    const s = sequenceOf([[new Date(), 1]])
    // @ts-expect-error
    expect(() => s.collect(Collectors.toObject())).toThrow(/key/i)

    const s2 = sequenceOf([[{}, 1]])
    // @ts-expect-error
    expect(() => s2.collect(Collectors.toObject())).toThrow(/key/i)

    const s3 = sequenceOf([[true, 1]])
    // @ts-expect-error
    expect(() => s3.collect(Collectors.toObject())).toThrow(/key/i)

    const s4 = sequenceOf([[null, 1]])
    // @ts-expect-error
    expect(() => s4.collect(Collectors.toObject())).toThrow(/key/i)
  })

  test('Collectors.first should collect the first item', () => {
    const s = sequenceOf([1, 2, 3])
    const result = s.collect(Collectors.first())
    expect(result).toBe(1)
  })

  test('Collectors.first should collect the first item of an empty sequence to undefined', () => {
    const s = sequenceOf([])
    const result = s.collect(Collectors.first())
    expect(result).toBeUndefined()
  })

  test('Collectors.findFirst should collect the first item that matches the predicate', () => {
    const s = sequenceOf([1, 2, 3])
    const result = s.collect(Collectors.findFirst((x) => x > 1))
    expect(result).toBe(2)
  })

  test('Collectors.reduce should reduce the items', () => {
    const s = sequenceOf([1, 2, 3])
    const result = s.collect(Collectors.reduce((acc, next) => acc + next, 0))
    expect(result).toBe(6)
  })

  test('Collectors.reduce should reduce the items without an initial value', () => {
    const s = sequenceOf([1, 2, 3])
    const result = s.collect(Collectors.reduce<number, number>((acc, next) => acc + next))
    expect(result).toBe(6)
  })

  test('Collectors.reduce should reduce the items of an empty sequence to undefined', () => {
    const s = sequenceOf([])
    const result = s.collect(Collectors.reduce((acc, next) => acc + next))
    expect(result).toBeUndefined()
  })

  test('Collectors.sum should sum the items', () => {
    const s = sequenceOf([1, 2, 3])
    const result = s.collect(Collectors.sum())
    expect(result).toBe(6)
  })

  test('Collectors.sum should sum the items of an empty sequence to 0', () => {
    const s = sequenceOf([])
    const result = s.collect(Collectors.sum())
    expect(result).toBe(0)
  })

  test('Collectors.sum should not be able to sum non-number items', () => {
    const s = sequenceOf(['a', 'b', 'c'])
    // @ts-expect-error
    expect(() => s.collect(Collectors.sum())).toThrow(/number/i)
  })

  test('Collectors.some should return true if some items match the predicate', () => {
    const s = sequenceOf([1, 2, 3])
    const result = s.collect(Collectors.some((x) => x > 1))
    expect(result).toBe(true)
  })

  test('Collectors.some should return false if no items match the predicate', () => {
    const s = sequenceOf([1, 2, 3])
    const result = s.collect(Collectors.some((x) => x > 3))
    expect(result).toBe(false)
  })

  test('Collectors.every should return true if all items match the predicate', () => {
    const s = sequenceOf([1, 2, 3])
    const result = s.collect(Collectors.every((x) => x > 0))
    expect(result).toBe(true)
  })

  test('Collectors.every should return false if some items do not match the predicate', () => {
    const s = sequenceOf([1, 2, 3])
    const result = s.collect(Collectors.every((x) => x > 1))
    expect(result).toBe(false)
  })

  test('Collectors.count should count the items', () => {
    const s = sequenceOf([1, 2, 3])
    const result = s.collect(Collectors.count())
    expect(result).toBe(3)
  })

  test('Collectors.count should count the items of an empty sequence', () => {
    const s = sequenceOf([])
    const result = s.collect(Collectors.count())
    expect(result).toBe(0)
  })
})
