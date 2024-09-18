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
  accumulator: (acc: A, item: T) => A,
  finisher?: (acc: A) => C
}

export function gatherer<T, V, C>(gatherer: Gatherer<T, V, C>) {
  return gatherer;
}

export function collector<T, A, C>(collector: Collector<T, A, C>) {
  return collector
}

interface Sequence<T> {
  gather: <V, C>(gatherer: Gatherer<T, V, C>) => Sequence<V>;
  collect: <A, C>(collector: Collector<T, A, C>) => C;
  forEach(action: (item: T) => void): void;
}

const WrapAll = Symbol("__wrapAll");
const Consume = Symbol("__consume")
interface SequenceNode<Head, Out> extends Sequence<Out> {
  [WrapAll](downstream: Sink<Out>): Sink<Head>;
  [Consume](sink: Sink<Out>): void;
}

function node<Head, In, Out>(
  source: () => Iterator<Head>,
  previous: SequenceNode<Head, In> | null,
  wrap: (downstream: Sink<Out>) => Sink<In>,
  wrapAll?: (downstream: Sink<Out>) => Sink<Head>
): SequenceNode<Head, Out> {
  let consumed = false;

  return {
    [WrapAll]: wrapAll ?? (downstream => previous![WrapAll](wrap(downstream))),

    [Consume](sink: Sink<Out>) {
      if (consumed) throw new Error("Sequence has already been consumed");
      consumed = true;
      const head = this[WrapAll]({
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
    },

    gather({
      initializer,
      integrator,
      finisher
    }) {
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

    collect<A, C>({
      supplier,
      accumulator,
      finisher = (acc) => acc as unknown as C
    }: Collector<Out, A, C>): C {
      let acc = supplier();
      this.forEach(item => acc = accumulator(acc, item));
      return finisher(acc);
    },

    forEach(action: (item: Out) => void) {
      this[Consume]({
        accept(item) {
          action(item);
          return true;
        },
        onFinish() { },
      });
    },
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
