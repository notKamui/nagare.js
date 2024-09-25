import { gatherer, type Sequence } from "./sequence";

export const Gatherers = {
  filter<T>(predicate: (item: T) => boolean) {
    return gatherer<T, T>({
      integrator(item, push) {
        if (predicate(item)) {
          return push(item);
        }
        return true;
      }
    })
  },

  map<T, V>(transform: (item: T) => V) {
    return gatherer<T, V>({
      integrator(item, push) {
        return push(transform(item));
      }
    })
  },

  flatMap<T, V>(transform: (item: T) => Sequence<V>) {
    return gatherer<T, V>({
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
  },

  flatten<T>() {
    return gatherer<Iterable<T>, T>({
      integrator(sequence, push) {
        for (const item of sequence) {
          if (!push(item)) return false;
        }
        return true;
      }
    })
  },

  zipWithNext<T>() {
    return gatherer<T, [T, T], { prev?: T }>({
      initializer() {
        return {}
      },
      integrator(item, push, context) {
        if (context.prev !== undefined) {
          if (!push([context.prev, item])) return false;
        }
        context.prev = item;
        return true;
      }
    })
  },

  zip<T, U>(other: Sequence<U>) {
    return gatherer<T, [T, U], { other: Iterator<U> }>({
      initializer() {
        return { other: other[Symbol.iterator]() }
      },
      integrator(item, push, context) {
        const next = context.other.next();
        if (next.done) return false;
        return push([item, next.value]);
      }
    })
  },

  withIndex<T>() {
    return gatherer<T, [T, number], { index: number }>({
      initializer() {
        return { index: 0 }
      },
      integrator(item, push, context) {
        return push([item, context.index++]);
      }
    })
  },

  take<T>(limit: number) {
    return gatherer<T, T, { count: number }>({
      initializer() { return { count: 0 } },
      integrator(item, push, context) {
        if (context.count >= limit) return false;
        context.count++;
        return push(item);
      }
    })
  },

  takeUntil<T>(predicate: (item: T) => boolean) {
    return gatherer<T, T>({
      integrator(item, push) {
        if (predicate(item)) return false;
        return push(item);
      }
    })
  },

  drop<T>(limit: number) {
    return gatherer<T, T, { count: number }>({
      initializer() { return { count: 0 } },
      integrator(item, push, context) {
        if (context.count >= limit) return push(item);
        context.count++;
        return true;
      }
    })
  },

  dropWhile<T>(predicate: (item: T) => boolean) {
    return gatherer<T, T, { dropping: boolean }>({
      initializer() { return { dropping: true } },
      integrator(item, push, context) {
        if (context.dropping) {
          if (predicate(item)) return true;
          context.dropping = false;
        }
        return push(item);
      }
    })
  },
} as const;