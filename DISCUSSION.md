# Issues not addressed elsewhere

## Cross-cutting concerns

There is a complexity increase in the specification of TypedArray to handle two kinds of buffers, and there is space for confusion around a couple of choices (to be enumerated here) where an operation creates a new buffer and could choose to create a new shared buffer or a new unshared buffer.

The new "Atomics" object adds a global name, which (with low probability, given what the name is) can conflict with code on the Web.

Shared memory adds significant, though localized, language complexity, in that the shared memory model is complicated (even if it is a simple model, as such models go) and in that pervasive system dependencies cannot reasonably be hidden by the language.  Data-race free programs are predictable (they are sequentially consistent) but are hard to write.  The low level of the shared memory API makes increases the likelihood of races.

The futex mechanism increases the risk of having deadlocked scripts.  This failure mode is not new - workers failing to communicate properly due to program bugs can already deadlock - but the synchronous wait mode renders the browser unresponsive, until some slow-script timeout breaks the deadlock and kills the script.

More generally, this low-level facility probably makes it more difficult in the future to introduce higher-level facilities that are strictly safer to use.  (We believe however that the low-level facility is good for building reasonably safe and performant solutions and that no such higher-level facility will be desired.)

## Select rationale

* asm.js compatibility + desire to support eg musl has steered us toward some decisions, such as futexes over a direct implementation of Synchronic (which requires some objects and garbage collection)

Note, this section is not finished.  It will eventually incorporate additional key points from the Rationale in the older spec document, at least.

