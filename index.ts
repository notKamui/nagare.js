import { sequenceOf } from "./sequence";

const numbers = [[1, 2], [3, 4], [5, 6], [7, 8], [9, 10]];

const n = sequenceOf(numbers)
  .flatMap(n => sequenceOf(n))
  .drop(2)
  .toArray();

console.log(n); // 51
