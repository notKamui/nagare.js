type Sequence<T> = {
  // Intermediate operations
  filter: (fn: (x: T) => boolean) => Sequence<T>;
  map: <R>(fn: (x: T) => R) => Sequence<R>;
  flatMap: <R>(fn: (x: T) => Sequence<R>) => Sequence<R>;
  flatten: () => Sequence<T extends Iterable<infer R> ? R : T>;

  // Terminal operations
  toArray: () => T[];
  fold: <R>(initial: R, fn: (acc: R, x: T) => R) => R;
  forEach: (fn: (x: T) => void) => void;
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

  function filter(fn: (x: T) => boolean) {
    return sequenceOf((function* () {
      for (const item of generator()) {
        if (fn(item)) {
          yield item;
        }
      }
    })());
  }

  function map<R>(fn: (x: T) => R) {
    return sequenceOf((function* () {
      for (const item of generator()) {
        yield fn(item);
      }
    })());
  }

  function flatMap<R>(fn: (x: T) => Sequence<R>) {
    return sequenceOf((function* () {
      for (const item of generator()) {
        yield* fn(item);
      }
    })());
  }

  function flatten() {
    return sequenceOf((function* () {
      for (const item of generator()) {
        if (isIterable(item)) {
          yield* item;
        } else {
          yield item;
        }
      }
    })());
  }

  function toArray() {
    checkConsumed();
    return Array.from(generator());
  }

  function fold<R>(initial: R, fn: (acc: R, x: T) => R) {
    checkConsumed();
    let result = initial;
    for (const item of generator()) {
      result = fn(result, item);
    }
    return result;
  }

  function forEach(fn: (x: T) => void) {
    checkConsumed();
    for (const item of generator()) {
      fn(item);
    }
  }

  return {
    filter,
    map,
    flatMap,
    flatten,
    toArray,
    fold,
    forEach,
    [Symbol.iterator]: () => {
      checkConsumed();
      return generator();
    }
  };
}
