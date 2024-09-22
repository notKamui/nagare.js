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

  sum() {
    return collector<number, number>({
      supplier() {
        return 0
      },
      accumulator(acc, item) {
        return acc + item
      }
    })
  }
} as const;