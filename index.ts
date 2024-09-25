import { Gatherers } from "./gatherers";
import { sequenceOf } from "./sequence";

let s = 0;
function ns() {
  return s++;
}

const n = sequenceOf(Math.random)
  .take(10)
  .gather(Gatherers.zip(sequenceOf(ns)))
  .map(([a, b]) => [b, a])
  .toArray()
  .join("\n");

console.log(n);
