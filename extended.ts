import { collector, gatherer, type Sequence } from "./sequence";

export function filterGatherer<T>(predicate: (item: T) => boolean) {
  return gatherer<T, T>({
    integrator(item, push) {
      if (predicate(item)) {
        return push(item);
      }
      return true;
    }
  })
}

export function mapGatherer<T, V>(transform: (item: T) => V) {
  return gatherer<T, V>({
    integrator(item, push) {
      return push(transform(item));
    }
  })
}

export function flatMapGatherer<T, V>(transform: (item: T) => Sequence<V>) {
  return gatherer<T, V, V[]>({
    integrator(item, push) {
      let cancelled = false;
      const subsequence = transform(item);
      subsequence.forEach(e => {
        if (cancelled) return;
        cancelled = !push(e);
      });
      return !cancelled;
    },
  })
}

export function findFirstCollector<T>(predicate: (item: T) => boolean) {
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
}

export function arrayCollector<T>() {
  return collector<T, T[]>({
    supplier() { return [] },
    accumulator(acc, item) {
      acc.push(item)
      return acc
    }
  })
}

export function setCollector<T>() {
  return collector<T, Set<T>>({
    supplier() { return new Set() },
    accumulator(acc, item) {
      acc.add(item)
      return acc
    }
  })
}

export function sumCollector() {
  return collector<number, number>({
    supplier() {
      return 0
    },
    accumulator(acc, item) {
      return acc + item
    }
  })
}