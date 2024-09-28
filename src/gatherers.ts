import type { Sequence } from './sequence'

export type Gatherer<T, V, C = never> =
  | {
      initializer: () => C
      integrator: (item: T, push: (item: V) => boolean, context: C) => boolean
      finisher?: (push: (item: V) => void, context: C) => void
    }
  | {
      initializer?: never
      integrator: (item: T, push: (item: V) => boolean) => boolean
      finisher?: (push: (item: V) => void) => void
    }

export function gatherer<T, V, C = V>(gatherer: Gatherer<T, V, C>): Gatherer<T, V, any> {
  return gatherer
}

export const Gatherers = {
  pipe<T1, V1, C1, V2, C2>(g1: Gatherer<T1, V1, C1>, g2: Gatherer<V1, V2, C2>) {
    return gatherer<T1, V2, [C1, C2]>({
      initializer() {
        return [g1.initializer?.() as C1, g2.initializer?.() as C2]
      },
      integrator(item, push, [c1, c2]) {
        return g1.integrator(item, (v1) => g2.integrator(v1, push, c2), c1)
      },
      finisher(push, [c1, c2]) {
        if (g1.finisher) {
          g1.finisher((v1) => {
            function nestedPush(v2: V2) {
              push(v1 as unknown as V2)
              push(v2)
            }
            g2.finisher?.(nestedPush, c2)
          }, c1)
        } else {
          g2.finisher?.(push, c2)
        }
      },
    })
  },

  peek<T>(callback: (item: T) => void) {
    return gatherer<T, T>({
      integrator(item, push) {
        callback(item)
        return push(item)
      },
    })
  },

  filter<T>(predicate: (item: T) => boolean) {
    return gatherer<T, T>({
      integrator(item, push) {
        if (predicate(item)) return push(item)
        return true
      },
    })
  },

  map<T, V>(transform: (item: T) => V) {
    return gatherer<T, V>({
      integrator(item, push) {
        return push(transform(item))
      },
    })
  },

  flatMap<T, V>(transform: (item: T) => Sequence<V>) {
    return gatherer<T, V>({
      integrator(item, push) {
        let cancelled = false
        const subsequence = transform(item)
        for (const e of subsequence) {
          if (cancelled) break
          cancelled = !push(e)
        }
        return !cancelled
      },
    })
  },

  flatten<T>() {
    return gatherer<Iterable<T>, T>({
      integrator(iterable, push) {
        if (!iterable[Symbol.iterator]) throw new Error('Cannot flatten non-nested sequence')
        for (const item of iterable) {
          if (!push(item)) return false
        }
        return true
      },
    })
  },

  zipWithNext<T>() {
    return gatherer<T, [T, T], { prev?: T }>({
      initializer() {
        return {}
      },
      integrator(item, push, context) {
        if (context.prev !== undefined) {
          if (!push([context.prev, item])) return false
        }
        context.prev = item
        return true
      },
    })
  },

  zip<T, U>(other: Sequence<U>) {
    return gatherer<T, [T, U], { other: Iterator<U> }>({
      initializer() {
        return { other: other[Symbol.iterator]() }
      },
      integrator(item, push, context) {
        const next = context.other.next()
        if (next.done) return false
        return push([item, next.value])
      },
    })
  },

  withIndex<T>() {
    return gatherer<T, [T, number], { index: number }>({
      initializer() {
        return { index: 0 }
      },
      integrator(item, push, context) {
        return push([item, context.index++])
      },
    })
  },

  take<T>(limit: number) {
    if (limit < 0 || !Number.isInteger(limit)) {
      throw new Error('Limit must be a non-negative integer')
    }
    return gatherer<T, T, { count: number }>({
      initializer() {
        return { count: 0 }
      },
      integrator(item, push, context) {
        if (context.count >= limit) return false
        context.count++
        return push(item)
      },
    })
  },

  takeUntil<T>(predicate: (item: T) => boolean) {
    return gatherer<T, T>({
      integrator(item, push) {
        if (predicate(item)) return false
        return push(item)
      },
    })
  },

  drop<T>(limit: number) {
    if (limit < 0 || !Number.isInteger(limit)) {
      throw new Error('Limit must be a non-negative integer')
    }
    return gatherer<T, T, { count: number }>({
      initializer() {
        return { count: 0 }
      },
      integrator(item, push, context) {
        if (context.count >= limit) return push(item)
        context.count++
        return true
      },
    })
  },

  dropWhile<T>(predicate: (item: T) => boolean) {
    return gatherer<T, T, { dropping: boolean }>({
      initializer() {
        return { dropping: true }
      },
      integrator(item, push, context) {
        if (context.dropping) {
          if (predicate(item)) return true
          context.dropping = false
        }
        return push(item)
      },
    })
  },

  sortedWith<T>(comparator: (a: T, b: T) => number) {
    return gatherer<T, T, T[]>({
      initializer() {
        return []
      },
      integrator(item, _, context) {
        context.push(item)
        return true
      },
      finisher(push, context) {
        context.sort(comparator).forEach(push)
      },
    })
  },

  distinct<T>() {
    return gatherer<T, T, Set<T>>({
      initializer() {
        return new Set()
      },
      integrator(item, push, context) {
        if (context.has(item)) return true
        context.add(item)
        return push(item)
      },
    })
  },

  groupBy<T, K, V = T>(keySelector: (item: T) => K, valueSelector: (item: T) => V = (item) => item as unknown as V) {
    return gatherer<T, [K, V[]], Map<K, V[] | undefined>>({
      initializer() {
        return new Map()
      },
      integrator(item, _, context) {
        const key = keySelector(item)
        let group = context.get(key)
        if (!group) {
          group = []
          context.set(key, group)
        }
        group.push(valueSelector(item))
        return true
      },
      finisher(push, context) {
        context.forEach((group, key) => {
          if (group) push([key, group])
        })
      },
    })
  },

  associateBy<T, K, V = T>(
    keySelector: (item: T) => K,
    valueSelector: (item: T) => V = (item) => item as unknown as V,
  ) {
    return gatherer<T, [K, V], Map<K, V | undefined>>({
      initializer() {
        return new Map()
      },
      integrator(item, _, context) {
        const key = keySelector(item)
        const value = valueSelector(item)
        context.set(key, value)
        return true
      },
      finisher(push, context) {
        context.forEach((value, key) => {
          if (value) push([key, value])
        })
      },
    })
  },
} as const
