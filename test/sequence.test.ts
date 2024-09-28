import { describe, expect, test } from 'bun:test'
import { sequenceOf } from '../src'

describe('sequences', () => {
  test('sequenceOf should return a sequence of the given iterable', () => {
    const s = sequenceOf([1, 2, 3])
    expect(s).toBeObject()
    expect(s).toHaveProperty('gather')
    expect(s).toHaveProperty('collect')
    expect(s).toHaveProperty('forEach')
  })
})

describe('built-in sequence operations', () => {
  test('should be able to chain operations', () => {
    const s = sequenceOf([1, 2, 3])
      .map((x) => x * 2)
      .filter((x) => x > 3)
      .toArray()
    expect(s).toEqual([4, 6])
  })

  test('should be able to peek', () => {
    let i = 1
    const s = sequenceOf([1, 2, 3])
      .peek((x) => {
        expect(x).toBe(i++)
      })
      .toArray()
    expect(s).toEqual([1, 2, 3])
  })

  test('should be able to filter', () => {
    const s = sequenceOf([1, 2, 3])
      .filter((x) => x > 2)
      .toArray()
    expect(s).toEqual([3])
  })

  test('should be able to map', () => {
    const s = sequenceOf([1, 2, 3])
      .map((x) => x * 2)
      .toArray()
    expect(s).toEqual([2, 4, 6])
  })

  test('should be able to flatMap', () => {
    const s = sequenceOf([1, 2, 3])
      .flatMap((x) => sequenceOf([x, x * 2]))
      .toArray()
    expect(s).toEqual([1, 2, 2, 4, 3, 6])
  })

  test('should be able to flatten', () => {
    const s = sequenceOf([
      [1, 2],
      [3, 4],
    ])
      .flatten()
      .toArray()
    expect(s).toEqual([1, 2, 3, 4])
  })

  test('should be able to zipWithNext', () => {
    const s = sequenceOf([1, 2, 3]).zipWithNext().toArray()
    expect(s).toEqual([
      [1, 2],
      [2, 3],
    ])
  })

  test('should be able to zip', () => {
    const s = sequenceOf([1, 2, 3])
      .zip(sequenceOf([4, 5, 6]))
      .toArray()
    expect(s).toEqual([
      [1, 4],
      [2, 5],
      [3, 6],
    ])
  })

  test('should be able to withIndex', () => {
    const s = sequenceOf([1, 2, 3]).withIndex().toArray()
    expect(s).toEqual([
      [1, 0],
      [2, 1],
      [3, 2],
    ])
  })

  test('should be able to take', () => {
    const s = sequenceOf([1, 2, 3]).take(2).toArray()
    expect(s).toEqual([1, 2])
  })

  test('should be able to takeUntil', () => {
    const s = sequenceOf([1, 2, 3])
      .takeUntil((x) => x > 1)
      .toArray()
    expect(s).toEqual([1])
  })

  test('should be able to drop', () => {
    const s = sequenceOf([1, 2, 3]).drop(2).toArray()
    expect(s).toEqual([3])
  })

  test('should be able to dropWhile', () => {
    const s = sequenceOf([1, 2, 3])
      .dropWhile((x) => x < 2)
      .toArray()
    expect(s).toEqual([2, 3])
  })

  test('should be able to sortedWith', () => {
    const s = sequenceOf([3, 2, 1])
      .sortedWith((a, b) => a - b)
      .toArray()
    expect(s).toEqual([1, 2, 3])
  })

  test('should be able to distinct', () => {
    const s = sequenceOf([1, 2, 2, 3]).distinct().toArray()
    expect(s).toEqual([1, 2, 3])
  })

  test('should be able to groupBy', () => {
    const s = sequenceOf([1, 2, 3])
      .groupBy((x) => x % 2)
      .toObject()
    expect(s).toEqual({
      0: [2],
      1: [1, 3],
    })
  })

  test('should be able to associateBy', () => {
    const s = sequenceOf([1, 2, 3])
      .associateBy((x) => x % 2)
      .toObject()
    expect(s).toEqual({
      0: 2,
      1: 3,
    })
  })

  test('should be able to call findFirst', () => {
    const s = sequenceOf([1, 2, 3]).findFirst((x) => x > 1)
    expect(s).toBe(2)
  })

  test('should be able to call first', () => {
    const s = sequenceOf([1, 2, 3]).first()
    expect(s).toBe(1)
  })

  test('should be able to call toArray', () => {
    const s = sequenceOf([1, 2, 3]).toArray()
    expect(s).toEqual([1, 2, 3])
  })

  test('should be able to call toSet', () => {
    const s = sequenceOf([1, 2, 3]).toSet()
    expect(s).toBeObject()
    expect(s).toHaveProperty('size', 3)
  })

  test('should be able to call forEach', () => {
    const s: number[] = []
    // biome-ignore lint: that's not the forEach biome thinks it is
    sequenceOf([1, 2, 3]).forEach((x) => s.push(x))
    expect(s).toEqual([1, 2, 3])
  })

  test('should be able to call reduce', () => {
    const s = sequenceOf([1, 2, 3]).reduce((acc, x) => acc + x, 0)
    expect(s).toBe(6)
  })

  test('should be able to call sum', () => {
    const s = sequenceOf([1, 2, 3]).sum()
    expect(s).toBe(6)
  })

  test('should be able to call some', () => {
    const s = sequenceOf([1, 2, 3]).some((x) => x > 2)
    expect(s).toBeTrue()
  })

  test('should be able to call every', () => {
    const s = sequenceOf([1, 2, 3]).every((x) => x > 0)
    expect(s).toBeTrue()
  })

  test('should be able to call count', () => {
    const s = sequenceOf([1, 2, 3]).count()
    expect(s).toBe(3)
  })

  test('should be able to call toObject', () => {
    const s = sequenceOf<[string, number]>([
      ['a', 1],
      ['b', 2],
    ]).toObject()
    expect(s).toEqual({ a: 1, b: 2 })
  })

  test('should be able to call count', () => {
    const s = sequenceOf([1, 2, 3]).count()
    expect(s).toBe(3)
  })

  test('should be able to be iterated over', () => {
    const s = sequenceOf([1, 2, 3])
    const a = []
    for (const x of s) {
      a.push(x)
    }
    expect(a).toEqual([1, 2, 3])
  })
})
