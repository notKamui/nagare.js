type Sequence<T> = {
  // Intermediate operations
  gather: <V, C>(acc: (item: T, context?: C) => Generator<V>, factory?: () => C) => Sequence<V>;
  filter: (predicate: (x: T) => boolean) => Sequence<T>;
  map: <R>(transform: (x: T) => R) => Sequence<R>;
  flatMap: <R>(transform: (x: T) => Sequence<R>) => Sequence<R>;
  flatten: [T] extends [Iterable<infer R>] ? () => Sequence<R> : never;
  take: (limit: number) => Sequence<T>;
  drop: (limit: number) => Sequence<T>;

  // Terminal operations
  collect<A, C>(factory: () => A, accumulator: (acc: A, item: T) => void, finisher?: ((acc: A) => C)): C
  toArray: () => T[];
  toSet: () => Set<T>;
  toObject: T extends readonly [infer K, infer V] | [infer K, infer V] ? [K] extends [string | number | symbol] ? () => Record<K, V> : never : never;
  first: () => T | undefined;
  reduce: <R>(reducer: (acc: R, next: T) => R, initial?: R) => R;
  sum: [T] extends [number] ? () => number : never;
  some: (predicate: (x: T) => boolean) => boolean;
  every: (predicate: (x: T) => boolean) => boolean;
  find: (predicate: (x: T) => boolean) => T | undefined;
  forEach: (action: (x: T) => void) => void;
  [Symbol.iterator]: () => Iterator<T>;
}

export class SequenceConsumedError extends Error {
  constructor() {
    super("Sequence has already been consumed");
  }
}

function isIterable(obj: any): obj is Iterable<any> {
  return obj != null && typeof obj[Symbol.iterator] === 'function';
}

export function sequenceOf<T>(input: Iterable<T>): Sequence<T> {
  const generator = function* () {
    for (const item of input) {
      yield item;
    }
  };

  let consumed = false;
  function checkConsumed() {
    if (consumed) throw new SequenceConsumedError();
    consumed = true;
  }

  function collect<A, C>(factory: () => A, accumulator: (acc: A, item: T) => void, finisher: ((acc: A) => C) = (acc) => acc as unknown as C): C {
    checkConsumed();
    const acc = factory();
    for (const item of generator()) {
      accumulator(acc, item);
    }
    return finisher(acc);
  }

  function gather<V, C>(acc: (item: T, context?: C) => Generator<V>, factory?: () => C): Sequence<V> {
    const context = factory?.();
    return sequenceOf((function* () {
      for (const item of generator()) {
        yield* acc(item, context)
      }
    })());
  }

  return {
    // Intermediate operations
    gather,

    filter(predicate) {
      return sequenceOf((function* () {
        for (const item of generator()) {
          if (predicate(item)) {
            yield item;
          }
        }
      })());
    },

    map(transform) {
      return sequenceOf((function* () {
        for (const item of generator()) {
          yield transform(item);
        }
      })());
    },

    flatMap(transform) {
      return sequenceOf((function* () {
        for (const item of generator()) {
          yield* transform(item);
        }
      })());
    },

    flatten: function () {
      return sequenceOf((function* () {
        for (const item of generator()) {
          if (!isIterable(item)) {
            throw new TypeError("flatten() can only be called on sequences of iterables");
          }
          yield* item;
        }
      })());
    } as any,

    take(limit) {
      return sequenceOf((function* () {
        let count = 0;
        for (const item of generator()) {
          if (count++ >= limit) break;
          yield item;
        }
      })());
    },

    drop(limit) {
      return sequenceOf((function* () {
        let count = 0;
        for (const item of generator()) {
          if (count++ < limit) continue;
          yield item;
        }
      })());
    },

    // Terminal operations
    collect,

    toArray() {
      checkConsumed();
      return Array.from(generator());
    },

    toSet() {
      checkConsumed();
      return new Set(generator());
    },

    toObject: function () {
      return collect(
        () => ({}),
        (acc: Record<any, any>, item: T) => {
          if (!Array.isArray(item) || item.length !== 2) {
            throw new TypeError("toObject() can only be called on sequences of pairs");
          }
          const [key, value] = item;
          acc[key] = value;
        },
        (acc) => acc
      );
    } as any,

    first() {
      checkConsumed();
      const iterator = generator();
      const first = iterator.next();
      return first.done ? undefined : first.value;
    },

    reduce<R>(reducer: (acc: R, x: T) => R, initial?: R) {
      checkConsumed();
      let iterator = generator();
      let result: R;

      if (initial === undefined) {
        const first = iterator.next();
        if (first.done) throw new TypeError("Reduce of empty sequence with no initial value");
        result = first.value as unknown as R;
      } else {
        result = initial;
      }

      for (const item of iterator) {
        result = reducer(result, item);
      }

      return result;
    },

    sum: function () {
      checkConsumed();
      let sum = 0;
      for (const item of generator()) {
        if (typeof item !== "number") {
          throw new TypeError("sum() can only be called on sequences of numbers");
        }
        sum += item;
      }
      return sum;
    } as any,

    some(predicate) {
      checkConsumed();
      for (const item of generator()) {
        if (predicate(item)) return true;
      }
      return false;
    },

    every(predicate) {
      checkConsumed();
      for (const item of generator()) {
        if (!predicate(item)) return false;
      }
      return true;
    },

    find(predicate) {
      checkConsumed();
      for (const item of generator()) {
        if (predicate(item)) return item;
      }
      return undefined;
    },

    forEach(action) {
      checkConsumed();
      for (const item of generator()) {
        action(item);
      }
    },

    [Symbol.iterator]: () => {
      checkConsumed();
      return generator();
    }
  };
}
