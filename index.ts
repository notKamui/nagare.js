import { sequenceOf } from "./sequence";

const numbers = [[1, 2], [3, 4], [5, 6], [7, 8], [9, 10]];

const n = sequenceOf(numbers)
  .flatten()
  .reduce<number>((acc, next) => acc + next);

console.log(n);
