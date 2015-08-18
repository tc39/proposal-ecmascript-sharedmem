# Issues not addressed elsewhere

## Cross-cutting concerns

This is a run-down of aspects of the Shared memory and Atomics specification that affect ECMAScript as a whole.

### Reusing TypedArray for shared views

The current spec uses TypedArrays for views on shared memory, this has several negative aspects:

* It complicates the definition of TypedArray, in order for it to handle two kinds of buffers that are only superficially similar
* There is space for confusion around a couple of choices (to be enumerated here) where a TypedArray operation creates a new buffer and could choose to create a new shared buffer or a new unshared buffer
* Host APIs that accept a TypedArray must be aware that that API may be mapping shared memory

An earlier design had a separate type hierarchy for shared views, but it was abandoned when it met with resistance.

### New Atomics object

The new "Atomics" object adds a global name, which - with low probability, given what the name is - can conflict with code on the Web.

One alternative is to move the static methods from Atomics to SharedArrayBuffer.

### Semantic complexity, races, machine dependencies

Shared memory adds significant, though localized, language complexity, in that the shared memory model is complicated (even if it is a simple model, as such models go) and in that pervasive system dependencies cannot reasonably be hidden by the language.  Programs with data races may perform differently on machines with weak and strong memory ordering, but behavior may also depend on whether a program becomes jitted or deoptimized, for example, if the interpreter executes synchronizing operations as part of its operation where the jitted code does not.

Data-race free programs are predictable (they are sequentially consistent) but can be hard to write.  The low level of the shared memory API increases the likelihood of creating racy programs.  Those problems can be mitigated by using safe abstractions.  However, the semantic complexity remains in the language.

### Deadlocks

The futex mechanism increases the risk of having deadlocked scripts.  This failure mode is not new - workers failing to communicate properly due to program bugs can already deadlock - but the synchronous wait mode renders the browser unresponsive, until some slow-script timeout breaks the deadlock and kills the script.

### Closing off the design space

More generally, this low-level facility probably makes it more difficult in the future to introduce higher-level facilities that are strictly safer to use.

We believe however that the low-level facility is good for building reasonably safe and performant abstractions and that no such higher-level facility will actually be desired, or, if one does become desired, we will want it to be compatible with the low-level facility, in the Extensible Web fashion.

## Select rationale

(Note, this section is not finished.  It will eventually incorporate additional key points from the Rationale in the older spec document, at least.)

### Futexes

Obviously futexes are very low level and quite hard to use effectively, and indeed they can be tricky to use efficiently.

The primary reason futexes were chosen as the blocking mechanism rather than a high-level mechanism such as mutexes or [synchronic objects](http://www.open-std.org/jtc1/sc22/wg21/docs/papers/2014/n4195.pdf) is that futexes do not require storage management or any kind of complex initialization, and as such, are a much better fit for asm.js than higher-level mechanisms.  Unlike SIMD, for example, mutexes and synchronic objects would have to be true references and would require cross-agent storage management, and might require a construction protocol that would be incompatible with translated C and C++ code.

In practice, reusable mutexes and synchronic objects for plain JS can be constructed on top of futexes fairly easily.  (We are still experimenting with implementation techniques for the very best performance, however.)
