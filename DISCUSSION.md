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

Shared memory adds significant, though localized, language complexity, in that the shared memory model is complicated (even if it is a simple model, as such models go) and in that pervasive system dependencies cannot reasonably be hidden by the language.  Programs with data races may perform differently on machines with weak and strong memory ordering, but behavior may also depend on whether a program becomes jitted or deoptimized, for example, if the interpreter executes synchronizing operations as part of its operation where the jitted code does not, or if the jit does not reload a value within a loop.

Data-race free programs are predictable (they are sequentially consistent) but can be hard to write.  The low level of the shared memory API increases the likelihood of creating racy programs.  Those problems can be mitigated by using safe abstractions.  However, the semantic complexity remains in the language.

### Deadlocks

The futex mechanism increases the risk of having deadlocked scripts.  This failure mode is not new - workers failing to communicate properly due to program bugs can already deadlock - but the synchronous wait mode renders the browser unresponsive, until some slow-script timeout breaks the deadlock and kills the script.  These deadlocks are a consequence of user program logic and thus correctable.

A more difficult issue is deadlocks resulting from reasonable implementation choices in the embedding.  If a browser uses the main thread to perform work on behalf of a worker or UI or the browser at large, then a waiting main thread can block progress on a worker whose user program is not (yet) trying to communicate with the main thread, but trying to do some task that requires access from the main thread.  While in principle a problem in the browser - workers are not the independent agents that they need to be - it may be difficult to adapt the browser.

### Closing off the design space

More generally, this low-level facility probably makes it more difficult in the future to introduce higher-level facilities that are strictly safer to use.

We believe however that the low-level facility is good for building reasonably safe and performant abstractions and that no such higher-level facility will actually be desired, or, if one does become desired, we will want it to be compatible with the low-level facility, in the Extensible Web fashion.

## Security issues

The only known security issue with this feature is that it allows the construction of high-resolution timers.  Such timers can be used to construct some types of side-channel attacks.  See [the issues](https://github.com/tc39/ecmascript_sharedmem/issues) for a deeper discussion; more information will be coming by and by.

## Select rationale

The original proposal (in the historical/ subdirectory) contains detailed rationale points, a run-down of machine characteristics, and implementation advice.  The following are the most important points.

### Futexes, storage management

Obviously futexes are very low level and quite hard to use.

The primary reason futexes were chosen as the blocking mechanism rather than a high-level mechanism such as mutexes or [synchronic objects](http://www.open-std.org/jtc1/sc22/wg21/docs/papers/2014/n4195.pdf) is that futexes do not require storage management or any kind of complex initialization, and as such are a better fit for asm.js than higher-level mechanisms.  Unlike SIMD values, for example, mutex objects and synchronic objects would have to be true references and would require cross-agent storage management, and might require a construction protocol that would be incompatible with translated C and C++ code.

In practice, reusable mutexes and synchronic objects for plain JS can be constructed on top of futexes fairly easily, though getting the very best performance can be hard.

Clearly SharedArrayBuffers must be reference counted across agents (requiring the use of finalization mechanisms already available in all JS engines), and there will be some storage management associated with using the futex implementation, but the garbage collectors need not trace through shared objects.

Finally, even if we were to adopt synchronic objects there would be a need for the lower-level atomics.  See [Issue #12](https://github.com/tc39/ecmascript_sharedmem/issues/12) as well as the draft proposal for synchronic (in the historical/ subdirectory) for discussion.

### Only sequentially consistent atomics

At the moment the spec provides only sequentially consistent atomics, as this simplifies the memory model.

There are several use cases for "relaxed" or "unordered" atomics, ie, loads and stores that are not optimized out, don't tear the datum, and don't create race conditions, but also don't create guarantees about their ordering relative to other memory operations as observed from other CPUs.  Relaxed atomics are a somewhat reasonable mapping (within our domain) of C++ volatile accesses, and can (probably) be used to implement non-tearing loads and stores as required by the JVM memory model.

It is desirable to provide relaxed atomics eventually, just not for the initial version of the specification.

### Data races, machine dependencies

The meaning of data races is currently semi-specified: data races are allowed, and the bytes affected by a race are limited to the union of the byte ranges accessed by the racing accesses, but the values that are stored in memory after a race are unpredictable.  This is in contrast with C++, where races have undefined behavior (anything can happen), and Java, where some races have defined behavior, notably, in a race of compatible accesses (same size, same address, same type) the observable values are limited to the values that were in memory before the race and the operands of the write operations.

As all modern mainstream hardware provides Java-like guarantees for integer data up to pointer size the same guarantees were originally adopted for the ES shared memory, but this was somewhat controversial (it complicates the memory model) and the specification was therefore loosened to its current state.  The necessary guarantees can be reintroduced in the form of relaxed atomics, when we need them.

On the other hand, going all the way to the C++ model is unacceptable in a safe language.  An alternative that was discussed is to make a race leave all of memory in an unpredictable state but the spec author finds this absurd for a language that is (traditionally) as tolerant of errors as ECMAScript.

The problem here is with the language specification more than the hardware, as all interesting hardware behaves reasonably in the face of races.  There is ongoing work for the C and C++ memory models to properly formalize weak atomic accesses, which is a related problem; this work shows that it is very hard to pin down the exact behavior of a race without going to a memory model like Java's, and Java's is known to have problems still.

The specification also precludes the use of read-modify-write accesses to implement writes to smaller data in terms of writes to larger data (writing bytes as part of a word, for example).  The justification for this is that no mainstream CPU since the first Alpha has not had appropriate read and write operations for smaller data sizes.  The same is not true for atomic accesses on all platforms: ARMv6, MIPS, and PPC do not have byte and halfword atomic operations, for example.  (The consequences of the latter point are under investigation and may on rare platforms - none of the three listed - preclude implementing byte and halfword atomics in terms of word atomics, but it should not otherwise be a problem.)
