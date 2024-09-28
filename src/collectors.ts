export interface Collector<T, A, R = A> {
  supplier: () => A
  accumulator: (acc: A, item: T, stop: () => void) => A
  finisher?: (acc: A) => R
}

export function collector<T, A, R = A>(collector: Collector<T, A, R>): Collector<T, any, R> {
  return collector
}

function reduce<T, R>(reducer: (acc: R, next: T) => R): Collector<T, R | undefined>
function reduce<T, R>(reducer: (acc: R, next: T) => R, initial: R): Collector<T, R>
function reduce<T, R>(reducer: (acc: R, next: T) => R, initial?: R) {
  return collector<T, R | undefined>({
    supplier() {
      return initial
    },
    accumulator(acc, item) {
      if (acc === undefined) return item as unknown as R
      return reducer(acc, item)
    },
  })
}

export const Collectors = {
  findFirst<T>(predicate: (item: T) => boolean) {
    return collector<T, T | undefined>({
      supplier() {
        return undefined
      },
      accumulator(acc, item, stop) {
        if (predicate(item)) {
          stop()
          return item
        }
        return acc
      },
    })
  },

  first<T>() {
    return collector<T, T | undefined>({
      supplier() {
        return undefined
      },
      accumulator(_, item, stop) {
        stop()
        return item
      },
    })
  },

  toArray<T>() {
    return collector<T, T[]>({
      supplier() {
        return []
      },
      accumulator(acc, item) {
        acc.push(item)
        return acc
      },
    })
  },

  toSet<T>() {
    return collector<T, Set<T>>({
      supplier() {
        return new Set()
      },
      accumulator(acc, item) {
        acc.add(item)
        return acc
      },
    })
  },

  toObject<T extends [K, V], K extends string | number | symbol, V>() {
    return reduce<T, Record<K, V>>(
      (acc, pair) => {
        if (pair.length !== 2) {
          throw new Error('Collectors.toObject can only be used with pairs')
        }
        const [k, v] = pair
        if (typeof k !== 'string' && typeof k !== 'number' && typeof k !== 'symbol') {
          throw new Error('Collectors.toObject can only be used with pairs with string, number or symbol keys')
        }
        acc[k] = v
        return acc
      },
      {} as Record<K, V>,
    )
  },

  reduce,

  sum() {
    return reduce<number, number>((acc, x) => {
      if (typeof x !== 'number') {
        throw new Error('sum() can only be used with a sequence of numbers')
      }
      return acc + x
    }, 0)
  },

  some<T>(predicate: (item: T) => boolean) {
    return collector<T, boolean>({
      supplier() {
        return false
      },
      accumulator(acc, item, stop) {
        if (predicate(item)) {
          stop()
          return true
        }
        return acc
      },
    })
  },

  every<T>(predicate: (item: T) => boolean) {
    return collector<T, boolean>({
      supplier() {
        return true
      },
      accumulator(acc, item, stop) {
        if (!predicate(item)) {
          stop()
          return false
        }
        return acc
      },
    })
  },

  count() {
    return collector<any, number>({
      supplier() {
        return 0
      },
      accumulator(acc) {
        return acc + 1
      },
    })
  },
} as const
