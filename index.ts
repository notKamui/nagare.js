import { createSequenceOfBuilder, gatherer } from "./sequence";

export function fooGathererFactory(someParam: number) {
  return gatherer({
    initializer: () => ({ count: 0 }),
    integrator: (item: number, push: (item: number) => boolean, context: { count: number }) => {
      context.count += 1;
      if (context.count <= someParam) {
        return push(item);
      }
      return false;
    }
  });
}
// Usage
const customSequenceOf = createSequenceOfBuilder()
  .withGatherer("foo", fooGathererFactory)
  .withGatherer("bar", fooGathererFactory)
  .build();

// Now, chaining built-in methods like `map` works correctly with custom methods like `foo`
const res = customSequenceOf([0, 1, 2]).map(n => n * 2).bar(2).foo(2).toArray();
console.log(res);  // Output: [0, 2, 4]
