import { sequenceOf } from "./sequence";

const n = sequenceOf([1, 2, 3, 4, 5])
  .take(10)
  .zipWithNext()
  .toArray();

console.log(n);
