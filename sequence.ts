import { Collectors } from "./collectors"
import { Gatherers } from "./gatherers"

interface Sink<E> {
  accept(item: E): boolean
  onFinish(): void
};

interface TailSink<E> {
  accept(item: E, stop: () => void): boolean
}

export type Gatherer<T, V, C = never> = {
  initializer: () => C,
  integrator: (item: T, push: (item: V) => boolean, context: C) => boolean,
  finisher?: (push: (item: V) => void, context: C) => void
} | {
  initializer?: never
  integrator: (item: T, push: (item: V) => boolean) => boolean
  finisher?: (push: (item: V) => void) => void
}

export type Collector<T, A, R = A> = {
  supplier: () => A,
  accumulator: (acc: A, item: T, stop: () => void) => A,
  finisher?: (acc: A) => R
}

export function gatherer<T, V, C = V>(gatherer: Gatherer<T, V, C>): Gatherer<T, V, any> {
  return gatherer;
}

export function collector<T, A, R = A>(collector: Collector<T, A, R>): Collector<T, any, R> {
  return collector
}

export interface Sequence<T> {
  gather: <V, C = V>(gatherer: Gatherer<T, V, C>) => Sequence<V>;
  collect: <A, R = A>(collector: Collector<T, A, R>) => R;
  forEach(action: (item: T) => void): void;

  // Gatherers
  filter(predicate: (item: T) => boolean): Sequence<T>;
  map<V>(transform: (item: T) => V): Sequence<V>;
  flatMap<V>(transform: (item: T) => Sequence<V>): Sequence<V>;
  flatten: [T] extends [Iterable<infer R>] ? () => Sequence<R> : never;
  zipWithNext(): Sequence<[T, T]>;
  take(limit: number): Sequence<T>;
  drop(limit: number): Sequence<T>;

  // Collectors
  findFirst(predicate: (item: T) => boolean): T | undefined;
  first(): T | undefined;
  toArray(): T[];
  toSet(): Set<T>;
  toObject: T extends readonly [infer K, infer V] | [infer K, infer V] ? [K] extends [string | number | symbol] ? () => Record<K, V> : never : never;
  reduce<R>(reducer: (acc: R, next: T) => R): R | undefined;
  reduce<R>(reducer: (acc: R, next: T) => R, initial: R): R;
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

    zipWithNext() {
      return this.gather(Gatherers.zipWithNext());
    },

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

    first() {
      return this.collect(Collectors.first());
    },

    toArray() {
      return this.collect(Collectors.toArray());
    },

    toSet() {
      return this.collect(Collectors.toSet());
    },

    toObject: function (this: Sequence<[string | number | symbol, Out]>) {
      return this.collect(Collectors.toObject());
    } as any,

    reduce: function (
      this: Sequence<Out>,
      reducer: (acc: any, next: Out) => any,
      initial?: any
    ) {
      return this.collect(Collectors.reduce(reducer, initial));
    } as any,

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

export function sequenceOf<T>(iterable: Iterable<T>): Sequence<T>;
export function sequenceOf<T>(generator: () => T): Sequence<T>;
export function sequenceOf<T>(iterableOrGenerator: Iterable<T> | (() => T)): Sequence<T> {
  const source = Symbol.iterator in iterableOrGenerator
    ? () => iterableOrGenerator[Symbol.iterator]()
    : () => ({ next: () => ({ done: false, value: iterableOrGenerator() }) });
  return node(
    source,
    null,
    _ => { throw new Error("Cannot wrap the source node") },
    downstream => downstream
  );
}
