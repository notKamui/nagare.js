import { sequenceOf } from "./sequence";
import { sequenceOf as sequenceOf2 } from "./sequence2";

function* numbers() {
  for (let i = 0; i < 1_000_000; i++) {
    yield i;
  }
};

const start1 = Bun.nanoseconds();
const result1 = sequenceOf(numbers())
  .filter(n => n % 2 === 0)
  .sum();
console.log("sequenceOf ", result1);
console.log("sequenceOf ", Bun.nanoseconds() - start1);

const start2 = Bun.nanoseconds();
const result2 = sequenceOf2(numbers())
  .filter(n => n % 2 === 0)
  .sum();
console.log("sequenceOf2", result2);
console.log("sequenceOf2", Bun.nanoseconds() - start2);
