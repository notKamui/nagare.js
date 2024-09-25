import { Gatherers } from "./gatherers";
import { sequenceOf } from "./sequence";

const people = [
  { name: "Alice", country: "USA" },
  { name: "Bob", country: "Canada" },
  { name: "Charlie", country: "USA" },
  { name: "David", country: "Canada" },
  { name: "Eve", country: "USA" },
]

const n = sequenceOf(people)
  .gather(Gatherers.pipe(
    Gatherers.filter(p => p.country === "USA"),
    Gatherers.map(p => p.name)
  ))
  .toArray();

console.log(n);
