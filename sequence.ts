type Sequence<T> = {
  // Intermediate operations
  filter: (predicate: (x: T) => boolean) => Sequence<T>;
  map: <R>(transform: (x: T) => R) => Sequence<R>;
  flatMap: <R>(transform: (x: T) => Sequence<R>) => Sequence<R>;
  flatten: T extends Iterable<infer R> ? () => Sequence<R> : never;
  take: (limit: number) => Sequence<T>;
  drop: (limit: number) => Sequence<T>;

  // Terminal operations
  toArray: () => T[];
  reduce: <R>(reducer: (acc: R, next: T) => R, initial?: R) => R;
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

  return {
    // Intermediate operations
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
          if (isIterable(item)) {
            yield* item;
          } else {
            throw new TypeError("flatten() can only be called on sequences of iterables");
          }
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
    toArray() {
      checkConsumed();
      return Array.from(generator());
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
