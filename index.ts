import { sequenceOf } from "./sequence";

const n = sequenceOf(Math.random)
  .take(10)
  .toArray();

console.log(n);
