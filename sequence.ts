import { Collectors } from "./collectors"
import { Gatherers } from "./gatherers"

interface Sink<E> {
  accept(item: E): boolean
  onFinish(): void
};

interface TailSink<E> {
  accept(item: E, stop: () => void): boolean
}

type Gatherer<T, V, C = V> = {
  initializer: () => C,
  integrator: (item: T, push: (item: V) => boolean, context: C) => boolean,
  finisher?: (push: (item: V) => void, context: C) => void
} | {
  initializer?: never
  integrator: (item: T, push: (item: V) => boolean) => boolean
  finisher?: (push: (item: V) => void) => void
}

type Collector<T, A, C = A> = {
  supplier: () => A,
  accumulator: (acc: A, item: T, stop: () => void) => A,
  finisher?: (acc: A) => C
}

export function gatherer<T, V, C = V>(gatherer: Gatherer<T, V, C>) {
  return gatherer;
}

export function collector<T, A, C = A>(collector: Collector<T, A, C>) {
  return collector
}

export interface Sequence<T> {
  gather: <V, C = V>(gatherer: Gatherer<T, V, C>) => Sequence<V>;
  collect: <A, C = A>(collector: Collector<T, A, C>) => C;
  forEach(action: (item: T) => void): void;

  // Gatherers
  filter(predicate: (item: T) => boolean): Sequence<T>;
  map<V>(transform: (item: T) => V): Sequence<V>;
  flatMap<V>(transform: (item: T) => Sequence<V>): Sequence<V>;
  flatten: [T] extends [Iterable<infer R>] ? () => Sequence<R> : never;
  take(limit: number): Sequence<T>;
  drop(limit: number): Sequence<T>;

  // Collectors
  findFirst(predicate: (item: T) => boolean): T | undefined;
  toArray(): T[];
  toSet(): Set<T>;
  reduce<R>(reducer: (acc: R, next: T) => R, initial?: R): R;
  sum: [T] extends [number] ? () => number : never;
  some(predicate: (item: T) => boolean): boolean;
  every(predicate: (item: T) => boolean): boolean;
}

const WrapAll = Symbol("__wrapAll");
const Consume = Symbol("__consume")
interface SequenceNode<Head, Out> extends Sequence<Out> {
  [WrapAll](downstream: Sink<Out>): Sink<Head>;
  [Consume](sink: TailSink<Out>): void;
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

    [Consume](sink: TailSink<Out>) {
      if (consumed) throw new Error("Sequence has already been consumed");
      consumed = true;

      let shouldStop = false;
      function stop() {
        shouldStop = true;
      }

      const head = this[WrapAll]({
        accept(item) {
          sink.accept(item, stop);
          return true;
        },
        onFinish() { },
      });
      const iterator = source();
      while (true) {
        const { done, value } = iterator.next();
        if (shouldStop || done || !head.accept(value)) {
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
            return integrator(item, downstream.accept, context as any);
          },
          onFinish() {
            finisher?.(downstream.accept, context as any);
            downstream.onFinish()
          }
        }),
      );
    },

    collect({
      supplier,
      accumulator,
      finisher = acc => acc as any
    }) {
      let acc = supplier();
      this[Consume]({
        accept(item, stop) {
          acc = accumulator(acc, item, stop);
          return true;
        },
      });
      return finisher(acc);
    },

    forEach(action: (item: Out) => void) {
      this[Consume]({
        accept(item) {
          action(item);
          return true;
        },
      });
    },

    // Gatherers
    filter(predicate) {
      return this.gather(Gatherers.filter(predicate));
    },

    map(transform) {
      return this.gather(Gatherers.map(transform));
    },

    flatMap(transform) {
      return this.gather(Gatherers.flatMap(transform));
    },

    flatten: function (this: Sequence<Iterable<Out>>) {
      return this.gather(Gatherers.flatten());
    } as any,

    take(limit) {
      return this.gather(Gatherers.take(limit));
    },

    drop(limit) {
      return this.gather(Gatherers.drop(limit));
    },

    // Collectors
    findFirst(predicate) {
      return this.collect(Collectors.findFirst(predicate));
    },

    toArray() {
      return this.collect(Collectors.toArray());
    },

    toSet() {
      return this.collect(Collectors.toSet());
    },

    reduce(reducer, initial) {
      return this.collect(Collectors.reduce(reducer, initial));
    },

    sum: function (this: Sequence<number>) {
      return this.collect(Collectors.sum());
    } as any,

    some(predicate) {
      return this.collect(Collectors.some(predicate));
    },

    every(predicate) {
      return this.collect(Collectors.every(predicate));
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
