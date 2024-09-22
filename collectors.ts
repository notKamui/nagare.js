import { collector } from "./sequence";

export const Collectors = {
  findFirst<T>(predicate: (item: T) => boolean) {
    return collector<T, T | undefined>({
      supplier() { return undefined },
      accumulator(acc, item, stop) {
        if (predicate(item)) {
          stop();
          return item;
        }
        return acc
      }
    })
  },

  toArray<T>() {
    return collector<T, T[]>({
      supplier() { return [] },
      accumulator(acc, item) {
        acc.push(item)
        return acc
      }
    })
  },

  toSet<T>() {
    return collector<T, Set<T>>({
      supplier() { return new Set() },
      accumulator(acc, item) {
        acc.add(item)
        return acc
      }
    })
  },

  reduce<T, R>(reducer: (acc: R, x: T) => R, initial?: R) {
    return collector<T, R | undefined, R>({
      supplier() {
        return initial
      },
      accumulator(acc, item) {
        if (acc === undefined) {
          return item as unknown as R
        } else {
          return reducer(acc, item)
        }
      },
      finisher(acc) {
        if (acc === undefined) {
          throw new TypeError("Reduce of empty sequence with no initial value")
        }
        return acc
      }
    })
  },

  sum() {
    return this.reduce<number, number>((acc, x) => acc + x, 0)
  },

  some<T>(predicate: (item: T) => boolean) {
    return collector<T, boolean>({
      supplier() { return false },
      accumulator(acc, item, stop) {
        if (predicate(item)) {
          stop()
          return true
        }
        return acc
      }
    })
  },

  every<T>(predicate: (item: T) => boolean) {
    return collector<T, boolean>({
      supplier() { return true },
      accumulator(acc, item, stop) {
        if (!predicate(item)) {
          stop()
          return false
        }
        return acc
      }
    })
  }
} as const;