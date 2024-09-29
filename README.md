# sequence

Proof of concept for lazy sequential execution/applications on iterables.

Closely follows the Java Stream API.

Performance is optimized as much as possible, 
but it is still mildly slower than regular applications on iterables in certain cases:
- flatMap tanks the performance
- the sequence is generally a bit faster than a regular application on iterables, except when the
amount of elements is extremely high, at which point the sequence is slightly slower (this is surprising)
