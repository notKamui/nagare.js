type Sink<E> = (item: E) => boolean;

type Gatherer<T> = <V, C>(
  acc: (item: T, push: (item: V) => boolean, context?: C) => boolean,
  factory?: () => C,
  finisher?: (push: (item: V) => void, context?: C) => void
) => Sequence<V>;

type Collector<T> = <A, C>(
  factory: () => A,
  accumulator: (acc: A, item: T) => void,
  finisher?: (acc: A) => C
) => C;

interface Sequence<T> {
  gather: Gatherer<T>;
  filter(predicate: (item: T) => boolean): Sequence<T>;

  collect: Collector<T>;
  forEach(action: (item: T) => void): void;
  toArray(): T[];
  sum: [T] extends [number] ? () => number : never;
}

const WrapAll = Symbol("__wrapAll");
interface SequenceNode<Head, Out> extends Sequence<Out> {
  [WrapAll]: (downstream: Sink<Out>) => Sink<Head>;
}

function node<Head, In, Out>(
  source: () => Iterator<Head>,
  previous: SequenceNode<Head, In> | null,
  wrap: (downstream: Sink<Out>) => Sink<In>,
  wrapAll?: (downstream: Sink<Out>) => Sink<Head>
): SequenceNode<Head, Out> {

  const __wrapAll = wrapAll ?? (downstream => previous![WrapAll](wrap(downstream)));

  let consumed = false;
  function consume(sink: Sink<Out>) {
    if (consumed) throw new Error("Sequence has already been consumed");
    consumed = true;
    const accept = __wrapAll((item) => {
      sink(item);
      return true;
    });
    const iterator = source();
    while (true) {
      const { done, value } = iterator.next();
      if (done) break;
      if (!accept(value)) break;
    }
  }

  function forEach(action: (item: Out) => void) {
    consume((item) => {
      action(item);
      return true;
    });
  }

  function collect<A, C>(factory: () => A, accumulator: (acc: A, item: Out) => void, finisher: (acc: A) => C = acc => acc as unknown as C): C {
    const acc = factory();
    forEach(item => accumulator(acc, item));
    return finisher(acc);
  }

  return {
    [WrapAll]: __wrapAll,

    gather(acc, factory, finisher) {
      const context = factory?.();
      return node(
        source,
        this,
        downstream => item => {
          if (acc(item, downstream, context)) {
            return true;
          }
          finisher?.(downstream, context);
          return false;
        },
      );
    },

    filter(predicate) {
      return this.gather((item, push) => {
        if (predicate(item)) {
          return push(item);
        }
        return true;
      })
    },

    collect,

    forEach,

    toArray() {
      return collect(() => [] as Out[], (acc, item) => acc.push(item));
    },

    sum: function () {
      let sum = 0;
      forEach(item => {
        if (typeof item !== "number") throw new Error("Cannot sum non-numeric values");
        sum += item;
      });
      return sum;
    } as any,

  }
}

export function sequenceOf<T>(iterable: Iterable<T>): Sequence<T> {
  return node(
    () => iterable[Symbol.iterator](),
    null,
    _ => { throw new Error("Cannot wrap the source node") },
    downstream => downstream
  );
}
