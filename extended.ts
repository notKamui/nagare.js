import { collector, gatherer } from "./sequence";

export function filterGatherer<T>(predicate: (item: T) => boolean) {
  return gatherer<T, T, unknown>({
    integrator(item, push) {
      if (predicate(item)) {
        return push(item);
      }
      return true;
    }
  })
}

export function arrayCollector<T>() {
  return collector<T, T[], unknown>({
    supplier() {
      return [] as T[]
    },
    accumulator(acc, item) {
      acc.push(item)
      return acc
    }
  })
}

export function sumCollector() {
  return collector<number, number, unknown>({
    supplier() {
      return 0
    },
    accumulator(acc, item) {
      return acc + item
    }
  })
}