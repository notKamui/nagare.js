type Sequence<T> = {
  // Intermediate operations
  filter: (predicate: (x: T) => boolean) => Sequence<T>;
  map: <R>(transform: (x: T) => R) => Sequence<R>;
  flatMap: <R>(transform: (x: T) => Sequence<R>) => Sequence<R>;
  flatten: () => Sequence<T extends Iterable<infer R> ? R : T>;
  take: (limit: number) => Sequence<T>;
  drop: (limit: number) => Sequence<T>;

  // Terminal operations
  toArray: () => T[];
  reduce: <R>(reducer: (acc: R, next: T) => R, initial?: R) => R;
  forEach: (action: (x: T) => void) => void;
  [Symbol.iterator]: () => Iterator<T>;
}

class SequenceConsumedError extends Error {
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

    flatten() {
      return sequenceOf((function* () {
        for (const item of generator()) {
          if (isIterable(item)) {
            yield* item;
          } else {
            yield item;
          }
        }
      })());
    },

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
