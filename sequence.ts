import { Collectors } from "./collectors";
import { Gatherers } from "./gatherers";

interface Sink<E> {
  accept(item: E): boolean;
  onFinish(): void;
}

interface TailSink<E> {
  accept(item: E, stop: () => void): boolean;
}

export type Gatherer<T, V, C = V> = {
  initializer: () => C;
  integrator: (item: T, push: (item: V) => boolean, context: C) => boolean;
  finisher?: (push: (item: V) => void, context: C) => void;
} | {
  initializer?: never;
  integrator: (item: T, push: (item: V) => boolean) => boolean;
  finisher?: (push: (item: V) => void) => void;
};

export type Collector<T, A, R = A> = {
  supplier: () => A;
  accumulator: (acc: A, item: T, stop: () => void) => A;
  finisher?: (acc: A) => R;
};

export function gatherer<T, V, C = V>(gatherer: Gatherer<T, V, C>) {
  return gatherer;
}

export function collector<T, A, R = A>(collector: Collector<T, A, R>) {
  return collector;
}

type WithCustomMethods<T, M> = M & Sequence<T, M>;

export type Sequence<T, M = {}> = {
  gather: <V, C = V>(gatherer: Gatherer<T, V, C>) => WithCustomMethods<V, M>;
  collect: <A, R = A>(collector: Collector<T, A, R>) => R;
  forEach(action: (item: T) => void): void;

  // Built-in Gatherers
  filter(predicate: (item: T) => boolean): WithCustomMethods<T, M>;
  map<V>(transform: (item: T) => V): WithCustomMethods<V, M>;
  flatMap<V>(transform: (item: T) => WithCustomMethods<V, M>): WithCustomMethods<V, M>;
  flatten: [T] extends [Iterable<infer R>] ? () => WithCustomMethods<R, M> : never;
  take(limit: number): WithCustomMethods<T, M>;
  drop(limit: number): WithCustomMethods<T, M>;

  // Built-in Collectors
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
};

interface SequenceNode<Head, Out> extends Sequence<Out, {}> {
  [WrapAll](downstream: Sink<Out>): Sink<Head>;
  [Consume](sink: TailSink<Out>): void;
}

const WrapAll = Symbol("__wrapAll");
const Consume = Symbol("__consume");

function node<Head, In, Out>(
  source: () => Iterator<Head>,
  previous: SequenceNode<Head, In> | null,
  wrap: (downstream: Sink<Out>) => Sink<In>,
  methods: Record<string, GathererFactory<any>>,
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

    // Built-in Gatherers with custom methods
    gather({ initializer, integrator, finisher }) {
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
            downstream.onFinish();
          }
        }),
        methods
      );
    },

    collect({ supplier, accumulator, finisher = acc => acc as any }) {
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

    // Built-in Gatherers
    filter(predicate) {
      return this.gather(Gatherers.filter(predicate));
    },

    map(transform) {
      return this.gather(Gatherers.map(transform));
    },

    flatMap(transform) {
      return this.gather(Gatherers.flatMap(transform));
    },

    flatten: function (this: Sequence<Iterable<Out>, {}>) {
      return this.gather(Gatherers.flatten());
    } as any,

    take(limit) {
      return this.gather(Gatherers.take(limit));
    },

    drop(limit) {
      return this.gather(Gatherers.drop(limit));
    },

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

    toObject: function (this: Sequence<[string | number | symbol, Out], {}>) {
      return this.collect(Collectors.toObject());
    } as any,

    reduce: function (
      this: Sequence<Out, {}>,
      reducer: (acc: any, next: Out) => any,
      initial?: any
    ) {
      return this.collect(Collectors.reduce(reducer, initial));
    } as any,

    sum: function (this: Sequence<number, {}>) {
      return this.collect(Collectors.sum());
    } as any,

    some(predicate) {
      return this.collect(Collectors.some(predicate));
    },

    every(predicate) {
      return this.collect(Collectors.every(predicate));
    },

    ...Object.fromEntries(Object.entries(methods).map(([name, factory]) =>
      [
        name,
        function (this: any, ...args: any[]) {
          return this.gather(factory(...args));
        }
      ]
    ))
  };
}

type GathererFactory<Args extends any[]> = (...args: Args) => Gatherer<any, any>;

interface SequenceBuilder<M = {}> {
  withGatherer<MethodName extends string, Args extends any[]>(
    name: MethodName,
    gathererFactory: GathererFactory<Args>
  ): SequenceBuilder<M & { [K in MethodName]: (...args: Args) => WithCustomMethods<any, M> }>;

  build(): <T>(iterable: Iterable<T>) => Sequence<T, M>;
}

export function createSequenceOfBuilder(): SequenceBuilder {
  const customGatherers: Record<string, GathererFactory<any[]>> = {};

  return {
    withGatherer<MethodName extends string, Args extends any[]>(
      name: MethodName,
      gathererFactory: GathererFactory<Args>
    ) {
      customGatherers[name] = gathererFactory;
      return this as any;
    },

    build() {
      return <T>(iterable: Iterable<T>) => {
        const baseSequence = node<T, T, T>(
          () => iterable[Symbol.iterator](),
          null,
          _ => {
            throw new Error("Cannot wrap the source node");
          },
          customGatherers,
          downstream => downstream
        );

        return baseSequence as any;
      };
    }
  };
}
