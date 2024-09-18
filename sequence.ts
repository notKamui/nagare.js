interface Sink<E> {
  accept(item: E): boolean
  onFinish(): void
};

type Gatherer<T, V, C> = {
  initializer?: () => C,
  integrator: (item: T, push: (item: V) => boolean, context?: C) => boolean,
  finisher?: (push: (item: V) => void, context?: C) => void
}

type Collector<T, A, C> = {
  supplier: () => A,
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
    const head = __wrapAll({
      accept(item) {
        sink.accept(item);
        return true;
      },
      onFinish() {
        sink.onFinish()
      },
    });
    const iterator = source();
    while (true) {
      const { done, value } = iterator.next();
      if (done || !head.accept(value)) {
        head.onFinish();
        break;
      }
    }
  }

  function forEach(action: (item: Out) => void) {
    consume({
      accept(item) {
        action(item);
        return true;
      },
      onFinish() { },
    });
  }

  function collect<A, C>({ supplier, accumulator, finisher }: Collector<Out, A, C>): C {
    const acc = supplier();
    forEach(item => accumulator(acc, item));
    const _finisher = finisher ?? ((acc: A) => acc as unknown as C);
    return _finisher(acc);
  }

  return {
    [WrapAll]: __wrapAll,

    gather({ initializer, integrator, finisher }) {
      const context = initializer?.();
      return node(
        source,
        this,
        downstream => ({
          accept(item) {
            return integrator(item, downstream.accept, context)
          },
          onFinish() {
            finisher?.(downstream.accept, context);
            downstream.onFinish()
          }
        }),
      );
    },

    filter(predicate) {
      return this.gather({
        integrator(item, push) {
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
      return collect({ supplier: () => [] as Out[], accumulator: (acc, item) => acc.push(item) });
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
