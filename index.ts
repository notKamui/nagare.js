import { sequenceOf } from "./sequence";

const numbers = [[1, 2], [3, 4], [5, 6], [7, 8], [9, 10]];

const evenDoubled = sequenceOf(numbers)
  .flatten()
  .filter((x) => x % 2 === 0)
  .map((x) => x * 2)
  .map((x) => [x.toString(), x] as const)
  .toObject();
console.log(evenDoubled);

const numbers2 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const sum = sequenceOf(numbers2)
  .sum();
console.log(sum);

const a = (function* (nb: number) {
  if (nb % 2 == 0) {
    yield nb;
  }
})

const even = sequenceOf(numbers2)
  .gather(function* (item) {
    if (item % 2 == 0) {
      yield item;
    }
  })
  .toArray();
console.log(even);