type Sink<E> = (item: E) => boolean;

type Gatherer<T, V, C> = {
  accumulator: (item: T, push: (item: V) => boolean, context?: C) => boolean,
  factory?: () => C,
  finisher?: (push: (item: V) => void, context?: C) => void
}

type Collector<T, A, C> = {
  factory: () => A,
  accumulator: (acc: A, item: T) => void,
  finisher?: (acc: A) => C
}

interface Sequence<T> {
  gather: <V, C>(gatherer: Gatherer<T, V, C>) => Sequence<V>;
  filter(predicate: (item: T) => boolean): Sequence<T>;

  collect: <A, C>(collector: Collector<T, A, C>) => C;
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

  function collect<A, C>({ factory, accumulator, finisher }: Collector<Out, A, C>): C {
    const acc = factory();
    forEach(item => accumulator(acc, item));
    const _finisher = finisher ?? ((acc: A) => acc as unknown as C);
    return _finisher(acc);
  }

  return {
    [WrapAll]: __wrapAll,

    gather({ accumulator, factory, finisher }) {
      const context = factory?.();
      return node(
        source,
        this,
        downstream => item => {
          if (accumulator(item, downstream, context)) {
            return true;
          }
          finisher?.(downstream, context);
          return false;
        },
      );
    },

    filter(predicate) {
      return this.gather({
        accumulator(item, push) {
          if (predicate(item)) {
            return push(item);
          }
          return true;
        }
      })
    },

    collect,

    forEach,

    toArray() {
      return collect({ factory: () => [] as Out[], accumulator: (acc, item) => acc.push(item) });
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
