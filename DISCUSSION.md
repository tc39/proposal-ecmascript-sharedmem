# Issues not addressed elsewhere

(Updated for the July 2016 draft in preparation for Stage 3.)

## Cross-cutting concerns

This is a run-down of aspects of the Shared memory and Atomics specification that affect ECMAScript as a whole.

### Reusing TypedArray for shared views

The current spec uses TypedArrays for views on shared memory, this has several negative aspects:

* It complicates the definition of TypedArray, in order for it to handle two kinds of buffers that are only superficially similar
* There is a little space for confusion around a couple of choices where a TypedArray operation creates a new buffer and could choose to create a new shared buffer or a new unshared buffer
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

## Why not just asm.js or wasm?

This is an issue that is separate from whether the feature has utility to JS programs: occasionally, the question is raised whether the shared memory cannot be hidden inside asm.js or wasm so that JS is not exposed to the complexity.

Briefly, neither asm.js or wasm exist in a vacuum: they will need to interact with JavaScript, and JavaScript will need to do some of the work on behalf of asm.js and wasm.  In practice, it will be very awkward for the memory used by asm.js and wasm not to be available to JS.  This means that JS will be exposed to something like SharedArrayBuffer, at least.  But for JS to have access to shared memory without having some kind of memory model that is compatible with asm.js and wasm is asking for trouble.  Specifically, this will look a lot like the old "threads as a library" situation where the host language's compiler (the JS jit) will not have a notion of how it may optimize certain memory accesses in the presence of shared memory, and mild chaos ensues.

## Select rationale

The original proposal (in the historical/ subdirectory) contains detailed rationale points, a run-down of machine characteristics, and implementation advice.  The following are the most important points.

### Futexes, storage management

Obviously futexes (currently embodied by Atomics.wait and Atomics.wake) are very low level and quite hard to use.

The primary reason futexes were chosen as the blocking mechanism rather than a high-level mechanism such as mutexes or [synchronic objects](http://www.open-std.org/jtc1/sc22/wg21/docs/papers/2014/n4195.pdf) is that futexes do not require storage management or any kind of complex initialization, and as such are a better fit for asm.js than higher-level mechanisms.  Unlike SIMD values, for example, mutex objects and synchronic objects would have to be true references and would require cross-agent storage management, and might require a construction protocol that would be incompatible with translated C and C++ code.

In practice, reusable mutexes and synchronic objects for plain JS can be constructed on top of futexes fairly easily, though getting the very best performance can be hard.

Clearly SharedArrayBuffers must be reference counted across agents (requiring the use of finalization mechanisms already available in all JS engines), and there will be some storage management associated with using the futex implementation, but the garbage collectors need not trace through shared objects.

Finally, even if we were to adopt synchronic objects there would be a need for the lower-level atomics.  See [Issue #12](https://github.com/tc39/ecmascript_sharedmem/issues/12) as well as the draft proposal for synchronic (in the historical/ subdirectory) for discussion.

### Only sequentially consistent atomics

At the moment the spec provides only sequentially consistent atomics, as this simplifies the memory model.

There are several use cases for "relaxed" or "unordered" atomics, ie, loads and stores that are not optimized out, don't tear the datum, and don't create race conditions, but also don't create guarantees about their ordering relative to other memory operations as observed from other CPUs.  Relaxed atomics are a somewhat reasonable mapping (within our domain) of C++ volatile accesses, and can (probably) be used to implement non-tearing loads and stores as required by the JVM memory model.

It is desirable to provide relaxed atomics eventually, just not for the initial version of the specification.

### Data races

The meaning of data races is currently semi-specified: data races are allowed, and the bytes affected by a race are limited to the union of the byte ranges accessed by the racing accesses, and the values that are stored in memory after a race are predictable to a limited extent.  Exactly what to guarantee, if anything, has been contentious.

On the one end of the spectrum there is C++, where races have undefined behavior -- anything can happen.  That is not acceptable for ES, since ES must be safe; a race in the user program cannot be wholly undefined behavior in the C++ sense.

The minimal safe alternative to undefined behavior is therefore to make a race leave all of the backing memory for SharedArrayBuffers (either all buffers or the buffer in which the race happened) in an unpredictable state, while not affecting other memory, including shared metadata.  This formalization is appealing to users whose main use case is translating C++ code to ES -- races are already undefined behavior.  (It is probably not appealing to anyone else.)

At the other end of the spectrum there is Java, where races have fairly closely circumscribed behavior, in order to prevent races on pointer fields from subverting safety.  If a read and a write on a pointer field race then the read observes either the pointer value that is in memory before the write or the pointer value that is written; if two writes race they are executed in some arbitrary order but the values written are not interleaved in any way (they don't tear).  Java also brings type safety to bear on the problem, in that a field is never both a pointer and some other kind of data that can be partially accessed, and modern hardware supports this type of safety directly: the hardware is "single-copy atomic" or "access-atomic" for pointer-sized values.

ES has less type safety than Java, in that TypedArrays of different access size can be mapped onto the same memory and thus a datum can be accessed in ways that may violate access-atomicity.  At the same time, it seems like a shame not to extend the existing hardware guarantees for access-atomicity to programs that can make use of them (thus potentially allowing programs written in safe threaded languages that rely on that guarantee to be translated to JS or asm.js).

With that as the background, and on the assumption that a platform that can't run Java won't be running ES either, early versions of the shared memory spec did try to expose the hardware's capability to predict the outcome of some races.  That was however controversial (it complicates the memory model some, and some people really wanted relaxed atomics for their C++ programs) and the specification was therefore loosened and races were given largely unspecified, though safe, effects.  Later, the loose specification met with opposition from another quarter (it's a lost opportunity).  Furthermore, the memory model as it ended up being stated is not (yet) made significantly more complex by pinning down some racy behavior.  In consequence, the spec has been tightened again, and now tries to specify how races might be handled and when racy behavior can be predicted.

The problem here is with the language specification -- the memory model -- more than the hardware, as all interesting hardware behaves reasonably in the face of races.  Data races expose optimizations in the compiler and the hardware and this plays havoc with the language specification, so making races undefined behavior keeps the language specification simple and does not outlaw desirable optimizations.  Java, needing to give meaning to some races, has a much more complicated memory model as a consequence, and even C++ has not escaped the problem, in that its relaxed atomic accesses are very similar to racy accesses in practice and complicate its memory model.

The shared memory proposal sidesteps the memory model complexity issue by splitting the model into two parts.  One part circumscribes a sublanguage that uses atomics in a disciplined way and whose data race free computations are sequentially consistent.  Programs written to this model (which includes all translated C and C++ programs that don't have undefined behavior) are immune to reorderings by the compiler and hardware.  The second part is operational, and describes the kinds of reorderings that the compiler and hardware may and may not do, and the types of interleavings that may be observed in the presence of data races.  This is not exactly elegant, and leaves open the question of a formalization of the memory model, but probably fits the operational style of the ES spec reasonably well and gives practical guidance to users and compiler writes alike.


### A summary of the constraints on the memory model

TC39 discussed the memory model at several meetings and some desiderata were enumerated.  Here is a list, with some discussion.

#### Correcness

The call for "correctness" means that instead of informal prose and/or pseudocode there should be a formalization of the memory model that we can trust.  We're currently far away from having that.

As described above, the spec attempts to layer the specification by defining what it means for a program to be data race free (at which point the program appears sequentially consistent), and then add operational details about programs with data races.  However, the definition of data race freedom is itself somewhat complicated in that it calls for atomics to be used in a consistent way within regions of the program.  That amounts to a kind of dynamic type discipline, but it is not established that that condition is sufficient or necessary for data race freedom - it's probably sufficient but probably not quite necessary.  The operational details that are then layered on top of that to specify the kinds of reorderings that might be observed in racy programs, and the outcomes of races, are commonsensical but not in any way formal.

At this point it is also not clear what form the formalization should take.  Axiomatic formalizations are traditional but have known problems with races; recent attempts have a more operational flavor, so as to incorporate reordering in the compiler and hardware (write buffers, speculation).

Presently (July 2016) Google is pursuing a research project with the goal of formalizing the memory model.

#### Quantum garbage

The characterization "quantum garbage" is informal but encompasses a couple of different phenomena where values in the program appear to change in extremely strange ways:

What appears to be a single read in the source program must not be allowed to take on several values. This occurs as a result of an optimization that duplicates the read, such as rematerialization (duplicate the read instead of storing the read value in a temp), deoptimization (one tier of execution might read the value and expose it, but then deopt back to another tier that adds another read for the value), and aggressive speculation (a conditional side effect that is executed early even though a later evaluation of the condition decides the effect should not occur).

What appears as a value in memory should not fluctuate counter to program logic.  This could occur as a result of inserted writes that are innocuous in single-threaded program, such as read-modify-write accesses (write a smaller datum in terms of a larger one), spurious writes (writing back a value that was just read to the slot it was read from), and using shared memory locations as temps (writing a temporary value to a slot that will later be overwritten with a final value).

To the author's knowledge, current JITs are not affected by these constraints, though it seems possible that future JITs could be, as new "higher-level" tiers are triggered by long-running, well-typed, compute-intensive programs.  But even in that case, optimization is only inhibited when operating on shared memory.  If the JIT knows shared memory is not accessed then it will not be restricted.

#### Out-of-thin-air values

The "out of thin air" problem can be characterized as one where the compiler or hardware guesses at the value to be read from memory in a situation where that guess will result in code being executed that makes the guess correct.  It is widely believed that this is exclusively a problem with the formalization of the memory model in the presence of relaxed atomics (or data races, in our case), not a problem with existing compilers or hardware.

(The problem also presupposes the ability of the compiler to simultaneously inspect the code of two concurrent threads but it's not clear whether that matters one way or the other; on the one hand, ES will generally run threads in separate agents, which are strongly separated from each other; on the other hand, there's no rule saying a JIT can't observe multiple agent programs.)

In the present proposal, data race free programs can't manufacture values out of thin air since the absence of races makes reorderings irrelevant, but programs with races could have the problem.  However, the shared memory proposal does not have this problem because it explicitly prohibits reorderings that would cause the problem to exist.  (This is lame but it's what everyone does, more or less.)
