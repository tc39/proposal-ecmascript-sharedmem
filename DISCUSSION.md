# Issues not addressed elsewhere

(This document is not finished.  It should incorporate key points from the Rationale in the older spec document, and maybe a few other things.)

## Cross-cutting concerns

(Hard to interpret "cross-cutting concerns" precisely, choose to interpret it as friction points wrt to current spec and language, and an opportunity for some self-critique.)

* Complexity increase in TypedArray to handle two kinds of buffers, space for confusion around a couple of choices (to be enumerated here)
* Memory model is mostly orthogonal to existing spec but introduces system dependencies (for broad notion of system)
* Races and deadlocks are not popular
* Global namespace pollution from "Atomics" object
* asm.js compatibility + desire to support eg musl has steered us toward some decisions, such as futexes over a direct implementation of Synchronic

More generally, this low-level facility probably has an impact on future attempts to introduce higher-level facilities that are safer to use.
