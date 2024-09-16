import { sequenceOf } from "./sequence";

const numbers = [[1, 2], [3, 4], [5, 6], [7, 8], [9, 10]];

const evenDoubled = sequenceOf(numbers)
  .flatten()
  .filter((x) => x % 2 === 0)
  .map((x) => x * 2)
  .toArray();
console.log(evenDoubled);

const numbers2 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const sum = sequenceOf(numbers2)
  .reduce<number>((acc, x) => acc + x);
console.log(sum);
