import { describe, expect, spyOn, test } from 'bun:test'
import { Gatherers, gatherer, sequenceOf } from '../src'

describe('gatherers', () => {
  test('gatherer factory should be an identity', () => {
    const g = gatherer<number, number, { index: number }>({
      integrator(item, push) {
        return push(item)
      },
    })

    expect(g).toBe(g)
  })

  test('gatherers should be able to be used with sequence.gather', () => {
    const s = sequenceOf([1, 2, 3])
    const g = gatherer<number, number, { index: number }>({
      integrator(item, push) {
        return push(item)
      },
    })
    const result = s.gather(g)
    expect(result).toBeObject()
    expect(result).toHaveProperty('gather')
    expect(result).toHaveProperty('collect')
    expect(result).toHaveProperty('forEach')
  })

  test('gatherers should be lazy', () => {
    const s = sequenceOf([1, 2, 3])
    const g = gatherer<number, number, { index: number }>({
      integrator(item, push) {
        return push(item)
      },
    })
    const integrator = spyOn(g, 'integrator')
    const gather = s.gather(g)
    expect(integrator).toHaveBeenCalledTimes(0)
    gather.toArray()
    expect(integrator).toHaveBeenCalledTimes(3)
  })

  test('gatherers should be able to hold contextual state', () => {
    const s = sequenceOf([1, 2, 3])
    const g = gatherer<number, number, { sum: number }>({
      initializer() {
        return { sum: 0 }
      },
      integrator(item, push, context) {
        context.sum += item
        return push(context.sum)
      },
    })
    const result = s.gather(g).toArray()
    expect(result).toEqual([1, 3, 6])
  })

  test('gatherers should be able to be finished', () => {
    const s = sequenceOf([1, 2, 3])
    const g = gatherer<number, number>({
      integrator(item, push) {
        return push(item)
      },
      finisher(push) {
        return push(4)
      },
    })
    const result = s.gather(g).toArray()
    expect(result).toEqual([1, 2, 3, 4])
  })
})

describe('built-in gatherers', () => {
  test('Gatherers.peek should be able to peek at items', () => {
    const s = sequenceOf([1, 2, 3])
    const tmp: number[] = []
    const result = s.gather(Gatherers.peek(() => tmp.push(0))).toArray()
    expect(result).toEqual([1, 2, 3])
    expect(tmp).toEqual([0, 0, 0])
  })

  test('Gatherers.filter should be able to filter items', () => {
    const s = sequenceOf([1, 2, 3, 4])
    const result = s.gather(Gatherers.filter((item) => item % 2 === 0)).toArray()
    expect(result).toEqual([2, 4])
  })

  test('Gatherers.map should be able to map items', () => {
    const s = sequenceOf([1, 2, 3])
    const result = s.gather(Gatherers.map((item) => item * 2)).toArray()
    expect(result).toEqual([2, 4, 6])
  })

  test('Gatherers.flatMap should be able to flatMap items', () => {
    const s = sequenceOf([1, 2, 3])
    const result = s.gather(Gatherers.flatMap((item) => sequenceOf([item, item * 2]))).toArray()
    expect(result).toEqual([1, 2, 2, 4, 3, 6])
  })

  test('Gatherers.flatten should be able to flatten nested sequences', () => {
    const s = sequenceOf([
      [1, 2],
      [3, 4],
    ])
    const result = s.gather(Gatherers.flatten()).toArray()
    expect(result).toEqual([1, 2, 3, 4])
  })

  test('Gatherers.flatten should not be able to flatten non-nested sequences', () => {
    const s = sequenceOf([1, 2, 3, 4])
    // @ts-expect-error
    expect(() => s.gather(Gatherers.flatten()).toArray()).toThrow(/non-nested/i)
  })

  test('Gatherers.zipWithNext should be able to zip with next item', () => {
    const s = sequenceOf([1, 2, 3])
    const result = s.gather(Gatherers.zipWithNext()).toArray()
    expect(result).toEqual([
      [1, 2],
      [2, 3],
    ])
  })

  test('Gatherers.zip should be able to zip with another sequence', () => {
    const s = sequenceOf([1, 2, 3])
    const result = s.gather(Gatherers.zip(sequenceOf([4, 5, 6]))).toArray()
    expect(result).toEqual([
      [1, 4],
      [2, 5],
      [3, 6],
    ])
  })

  test('Gatherers.withIndex should be able to add index to items', () => {
    const s = sequenceOf(['a', 'b', 'c'])
    const result = s.gather(Gatherers.withIndex()).toArray()
    expect(result).toEqual([
      ['a', 0],
      ['b', 1],
      ['c', 2],
    ])
  })

  test('Gatherers.take should be able to take a limited number of items', () => {
    const s = sequenceOf([1, 2, 3, 4])
    const result = s.gather(Gatherers.take(2)).toArray()
    expect(result).toEqual([1, 2])
  })

  test('Gatherers.take should be able to take all items if limit is greater than length', () => {
    const s = sequenceOf([1, 2, 3, 4])
    const result = s.gather(Gatherers.take(5)).toArray()
    expect(result).toEqual([1, 2, 3, 4])
  })

  test('Gatherers.take should be able to take no items if limit is zero', () => {
    const s = sequenceOf([1, 2, 3, 4])
    const result = s.gather(Gatherers.take(0)).toArray()
    expect(result).toEqual([])
  })

  test('Gatherers.take should crash if limit is negative', () => {
    const s = sequenceOf([1, 2, 3, 4])
    expect(() => s.gather(Gatherers.take(-1)).toArray()).toThrow(/non-negative/i)
  })

  test('Gatherers.take should crash if limit is not an integer', () => {
    const s = sequenceOf([1, 2, 3, 4])
    expect(() => s.gather(Gatherers.take(1.5)).toArray()).toThrow(/integer/i)
  })

  test('Gatherers.take should crash if limit is NaN', () => {
    const s = sequenceOf([1, 2, 3, 4])
    expect(() => s.gather(Gatherers.take(Number.NaN)).toArray()).toThrow(/integer/i)
  })

  test('Gatherers.take should crash if limit is Infinity', () => {
    const s = sequenceOf([1, 2, 3, 4])
    expect(() => s.gather(Gatherers.take(Number.POSITIVE_INFINITY)).toArray()).toThrow(/integer/i)
  })

  test('Gatherers.take should crash if limit is -Infinity', () => {
    const s = sequenceOf([1, 2, 3, 4])
    expect(() => s.gather(Gatherers.take(Number.NEGATIVE_INFINITY)).toArray()).toThrow(/integer/i)
  })

  test('Gatherers.takeUntil should be able to take items until predicate is true', () => {
    const s = sequenceOf([1, 2, 3, 4])
    const result = s.gather(Gatherers.takeUntil((item) => item === 3)).toArray()
    expect(result).toEqual([1, 2])
  })

  test('Gatherers.drop should be able to drop a limited number of items', () => {
    const s = sequenceOf([1, 2, 3, 4])
    const result = s.gather(Gatherers.drop(2)).toArray()
    expect(result).toEqual([3, 4])
  })

  test('Gatherers.drop should be able to drop all items if limit is greater than length', () => {
    const s = sequenceOf([1, 2, 3, 4])
    const result = s.gather(Gatherers.drop(5)).toArray()
    expect(result).toEqual([])
  })

  test('Gatherers.drop should be able to drop no items if limit is zero', () => {
    const s = sequenceOf([1, 2, 3, 4])
    const result = s.gather(Gatherers.drop(0)).toArray()
    expect(result).toEqual([1, 2, 3, 4])
  })

  test('Gatherers.drop should crash if limit is negative', () => {
    const s = sequenceOf([1, 2, 3, 4])
    expect(() => s.gather(Gatherers.drop(-1)).toArray()).toThrow(/non-negative/i)
  })

  test('Gatherers.drop should crash if limit is not an integer', () => {
    const s = sequenceOf([1, 2, 3, 4])
    expect(() => s.gather(Gatherers.drop(1.5)).toArray()).toThrow(/integer/i)
  })

  test('Gatherers.drop should crash if limit is NaN', () => {
    const s = sequenceOf([1, 2, 3, 4])
    expect(() => s.gather(Gatherers.drop(Number.NaN)).toArray()).toThrow(/integer/i)
  })

  test('Gatherers.drop should crash if limit is Infinity', () => {
    const s = sequenceOf([1, 2, 3, 4])
    expect(() => s.gather(Gatherers.drop(Number.POSITIVE_INFINITY)).toArray()).toThrow(/integer/i)
  })

  test('Gatherers.drop should crash if limit is -Infinity', () => {
    const s = sequenceOf([1, 2, 3, 4])
    expect(() => s.gather(Gatherers.drop(Number.NEGATIVE_INFINITY)).toArray()).toThrow(/integer/i)
  })

  test('Gatherers.dropWhile should be able to drop items while predicate is true', () => {
    const s = sequenceOf([1, 2, 3, 4])
    const result = s.gather(Gatherers.dropWhile((item) => item < 3)).toArray()
    expect(result).toEqual([3, 4])
  })

  test('Gatherers.sortedWith should be able to sort items with a custom comparator', () => {
    const s = sequenceOf([3, 1, 4, 1, 5, 9, 2, 6, 5])
    const result = s.gather(Gatherers.sortedWith((a, b) => a - b)).toArray()
    expect(result).toEqual([1, 1, 2, 3, 4, 5, 5, 6, 9])
  })

  test('Gatherers.sortedWith should be able to sort items with a custom comparator in reverse', () => {
    const s = sequenceOf([3, 1, 4, 1, 5, 9, 2, 6, 5])
    const result = s.gather(Gatherers.sortedWith((a, b) => b - a)).toArray()
    expect(result).toEqual([9, 6, 5, 5, 4, 3, 2, 1, 1])
  })

  test('Gatherers.distinct should be able to remove duplicates', () => {
    const s = sequenceOf([1, 2, 3, 4, 2, 3, 4, 5])
    const result = s.gather(Gatherers.distinct()).toArray()
    expect(result).toEqual([1, 2, 3, 4, 5])
  })

  test('Gatherers.groupBy should be able to group items by a key', () => {
    const s = sequenceOf([1, 2, 3, 4, 5, 6, 7, 8, 9])
    const result = s.gather(Gatherers.groupBy((item) => (item % 2 === 0 ? 'even' : 'odd'))).toObject()
    expect(result).toEqual({
      even: [2, 4, 6, 8],
      odd: [1, 3, 5, 7, 9],
    })
  })

  test('Gatherers.groupBy should be able to group items by a key and transform them', () => {
    const s = sequenceOf([1, 2, 3, 4, 5, 6, 7, 8, 9])
    const result = s
      .gather(
        Gatherers.groupBy(
          (item) => (item % 2 === 0 ? 'even' : 'odd'),
          (item) => `_${item}_`,
        ),
      )
      .toObject()
    expect(result).toEqual({
      even: ['_2_', '_4_', '_6_', '_8_'],
      odd: ['_1_', '_3_', '_5_', '_7_', '_9_'],
    })
  })

  test('Gatherers.associateBy should be able to associate items by a key', () => {
    const s = sequenceOf([1, 2, 3, 4, 5, 6, 7, 8, 9])
    const result = s.gather(Gatherers.associateBy((item) => (item % 2 === 0 ? 'even' : 'odd'))).toObject()
    expect(result).toEqual({
      even: 8,
      odd: 9,
    })
  })

  test('Gatherers.associateBy should be able to associate items by a key and transform them', () => {
    const s = sequenceOf([1, 2, 3, 4, 5, 6, 7, 8, 9])
    const result = s
      .gather(
        Gatherers.associateBy(
          (item) => (item % 2 === 0 ? 'even' : 'odd'),
          (item) => `_${item}_`,
        ),
      )
      .toObject()
    expect(result).toEqual({
      even: '_8_',
      odd: '_9_',
    })
  })

  test('Gatherers.pipe should be able to combine two gatherers', () => {
    const s = sequenceOf([1, 2, 3, 4, 5])
    const result = s
      .gather(
        Gatherers.pipe(
          Gatherers.filter((item) => item % 2 === 0),
          Gatherers.map((item) => item * 2),
        ),
      )
      .toArray()
    expect(result).toEqual([4, 8])
  })
})
