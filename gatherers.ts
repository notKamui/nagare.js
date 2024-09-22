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
    return gatherer<T, any, V>({
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

  drop<T>(limit: number) {
    return gatherer<T, T, { count: number }>({
      initializer() { return { count: 0 } },
      integrator(item, push, context) {
        if (context.count >= limit) return push(item);
        context.count++;
        return true;
      }
    })
  }
} as const;