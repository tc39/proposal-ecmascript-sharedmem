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

At the moment the proposal provides only sequentially consistent atomics, as this is thought to simplify the memory model significantly and to increase the chance that TC39 will adopt the proposal.

The proposal has been written with the intent that a later iteration can add weaker atomics: "acquire-release" and "relaxed" (unordered).  Weaker atomics are important for good performance in some algorithms because they reduce the number of synchronization operations the CPU must perform against the memory and provide flexibility to the CPU in reordering memory operations.

A program that uses a weak atomic can normally be rewritten as one that uses a stronger atomic, so programmability does not suffer by leaving out the weak atomics, but the performance difference can sometimes be significant.  (Compiler optimizations can reduce the additional cost in some cases, but not in general.)

Note that even though the proposal specifies reasonably well-understood behavior for some races -- for example, two int32 stores that race will store one value before the other, not an interleaving -- programs cannot in general use those types of racy accesses as a substitute for relaxed atomics.  Racy accesses can be reordered (by the compiler) in ways that relaxed atomic accesses would not be, for example, racy accesses can (and will!) be hoisted out of loops.  In contrast, reordering of relaxed atomic accesses would normally be more tightly constrained.

### A limited set of atomic operations

#### Only integer atomics

As the present proposal was being developed, there was no obvious argument to be made for atomics on floating point numbers except generality.  It's clear that some use cases exists, and indeed C++ has floating-point atomics, and indeed some versions of the proposal included support for atomics on Float32Array, Float64Array, and even Uint8ClampedArray.  However, in the end there was consensus to remove that support (as a complexity-reducing measure), and to add it later should a definite need develop.  In the mean time, user code can construct its own (non-lock-free) floating point atomics from existing mechanisms.

#### No 8-byte atomics

A greater concern for those who are porting code from other languages is that there are no 8-byte integer atomics.  ES has no 8-byte integer type at this time.  Thus, the API for 8-byte atomics would have to be quite different than the API for atomics of other sizes.  That would be OK if ES were never to get an 8-byte integer type, but that is not actually likely, indeed 8-byte integers are highly desired and may be added soon.  Adding an API for 8-byte atomics now would thus create a soon-to-be-orphaned API, not a desirable situation.  In the mean time, user code can construct its own (non-lock-free) 8-byte integer atomics from existing mechanisms.

#### No atomics on DataView

Atomics are only available on integer TypedArrays, not on DataView objects.  This is a practical consideration; DataView objects are frequently accessed at unaligned addresses while atomic accesses must be aligned on most platforms.  One could perhaps fix that by always making DataView atomics non-lock-free, but that seems to create complications as the DataView memory can be aliased by other DataViews and by TypedArrays (where atomics can't all be non-lock-free).  There is also no obvious use case for atomics on DataViews, which are fairly slow compared to TypedArrays due to their generality.  It seemed better to leave this to user code, which can construct its own (non-lock-free) DataView atomics from existing mechanisms, when it knows that there are no aliasing issues.

### Data races

The meaning of data races is currently semi-specified: data races are allowed, and the bytes affected by a race are limited to the union of the byte ranges accessed by the racing accesses, and the values that are stored in memory after a race are predictable to a limited extent.  Exactly what to guarantee, if anything, has been contentious.

On the one end of the spectrum there is C++, where races have undefined behavior -- anything can happen.  That is not acceptable for ES, since ES must be safe; a race in the user program cannot be wholly undefined behavior in the C++ sense.

The minimal safe alternative to undefined behavior is therefore to make a race leave all of the backing memory for SharedArrayBuffers (either all buffers or the buffer in which the race happened) in an unpredictable state, while not affecting other memory, including shared metadata.  This formalization is appealing to users whose main use case is translating C++ code to ES -- races are already undefined behavior.  (It is probably not appealing to anyone else.)

At the other end of the spectrum there is Java, where races have fairly closely circumscribed behavior, in order to prevent races on pointer fields from subverting safety.  If a read and a write on a pointer field race then the read observes either the pointer value that is in memory before the write or the pointer value that is written; if two writes race they are executed in some arbitrary order but the values written are not interleaved in any way (they don't tear).  Java also brings type safety to bear on the problem, in that a field is never both a pointer and some other kind of data that can be partially accessed, and modern hardware supports this type of safety directly: the hardware is "single-copy atomic" or "access-atomic" for pointer-sized values.

ES has less type safety than Java, in that TypedArrays of different access size can be mapped onto the same memory and thus a datum can be accessed in ways that may violate access-atomicity.  At the same time, it seems like a shame not to extend the existing hardware guarantees for access-atomicity to programs that can make use of them (thus potentially allowing programs written in safe threaded languages that rely on that guarantee to be translated to JS or asm.js).

With that as the background, and on the assumption that a platform that can't run Java won't be running ES either, early versions of the shared memory spec did try to expose the hardware's capability to predict the outcome of some races.  That was however controversial (it complicates the memory model some, and some people really wanted relaxed atomics for their C++ programs) and the specification was therefore loosened and races were given largely unspecified, though safe, effects.  Later, the loose specification met with opposition from another quarter (it's a lost opportunity).  Furthermore, the memory model as it ended up being stated is not (yet) made significantly more complex by pinning down some racy behavior.  In consequence, the spec has been tightened again, and now tries to specify how races might be handled and when racy behavior can be predicted.

The problem here is with the language specification -- the memory model -- more than the hardware, as all interesting hardware behaves reasonably in the face of races.  Data races expose optimizations in the compiler and the hardware and this plays havoc with the language specification, so making races undefined behavior keeps the language specification simple and does not outlaw desirable optimizations.  Java, needing to give meaning to some races, has a much more complicated memory model as a consequence, and even C++ has not escaped the problem, in that its relaxed atomic accesses are very similar to racy accesses in practice and complicate its memory model.

The shared memory proposal sidesteps the memory model complexity issue by splitting the model into two parts.  One part circumscribes a sublanguage that uses atomics in a disciplined way and whose data race free computations are sequentially consistent.  Programs written to this model (which includes all translated C and C++ programs that don't have undefined behavior) are immune to reorderings by the compiler and hardware.  The second part is operational, and describes the kinds of reorderings that the compiler and hardware may and may not do, and the types of interleavings that may be observed in the presence of data races.  This is not exactly elegant, and leaves open the question of a formalization of the memory model, but probably fits the operational style of the ES spec reasonably well and gives practical guidance to users and compiler writes alike.

### Implementation constraints from data race semantics

We depend on access-atomicity in some cases, but this should not impact implementations significantly.  The TypedArray elements that must be access-atomic are already subject to being accessed using the Atomics methods, and furthermore, four-byte atomic accesses must be lock free.  On most systems (ARM, MIPS, Power), the need for lock-free atomic accesses will force a four-byte alignment for every Int32Array and Uint32Array, even if the system can handle unaligned non-atomic accesses.  Thus the need for access-atomicity will not create any new alignment constraints.  On x86 systems starting with the Core-2 Duo (introduced 2007) there is general support for unaligned accesses both in terms of full atomicity and access-atomicity, and though it will be natural to align shared memory also on this system, it is not necessary.

### A summary of the constraints on the memory model

TC39 discussed the memory model at several meetings and some desiderata were enumerated.  Here is a list, with some discussion.

#### Correctness

The call for "correctness" means that instead of informal prose and/or pseudocode there should be a formalization of the memory model that we can trust because it's mathematical and we have proven its correctness.  We're currently far away from having that.

As described above, the spec attempts to layer the specification by defining what it means for a program to be data race free (at which point the program appears sequentially consistent), and then add operational details about programs with data races.  However, the definition of data race freedom is itself somewhat complicated in that it calls for atomics to be used in a consistent way within regions of the program.  That amounts to a kind of dynamic type discipline, but it is not established that that condition is sufficient or necessary for data race freedom - it's probably sufficient but probably not quite necessary.  The operational details that are then layered on top of that to specify the kinds of reorderings that might be observed in racy programs, and the outcomes of races, are commonsensical but not in any way formal.

At this point it is also not clear what form the formalization should take.  Axiomatic formalizations are traditional but have known problems with races; recent attempts have a more operational flavor, so as to incorporate reordering in the compiler and hardware (write buffers, speculation).

Presently (July 2016) Google is pursuing a research project with the goal of formalizing the memory model.

#### Races "leaking" into the semantics of the rest of the language

The characterization of "semantic leak" is informal but the intuition here is that the necessity to give a safe semantic meaning to data races complicates the semantics of "the rest of" the language (itself an informal idea).

I think this is a non-problem for ES as things stand, primarily because shared memory is disjoint from non-shared memory, is distinguishable from non-shared memory at run-time, is never object memory but always flat (ArrayBuffer-like) memory, and there is separate semantic machinery for accessing it.  The memory model also provides rules on legal program reorderings that apply only to shared accesses; if it is known that an access is not to shared memory those rules can be ignored.

It is true that if the compiler does not know whether an access is to shared memory or not it must assume the memory is shared.  The rules on reorderings will not cause semantic problems for accesses to non-shared memory.  If the compiler assumes the memory may be shared but does not know then it must also implement certain non-atomic accesses as if they might be racy, but this imposes no particular hardship and does not change semantics, it only (potentially) curtails some optimization opportunities.

For most JITs, simply assuming that all TypedArray accesses are to shared memory and having a single compilation policy will suffice.  However, for a sophisticated tiered JIT, the most likely implementation strategy is to observe whether a function is invoked on shared memory or not, test the observation at run-time, and choose a compilation strategy based on the observation.  In this case the presence of shared memory does not affect code compiled for private memory.

#### Races leaking private data at run-time

At one stage the spec called for the effect of a race to be that data written in the race could be read back as "any value whatsoever".  It was pointed out that returning unknown register or memory contents could result in leaking secrets, such as fragments of passwords previously stored in those registers or locations.

Races are now more defined than that, and the problem no longer exists.

#### Quantum garbage

The characterization "quantum garbage" is informal but encompasses a couple of different phenomena where values in the program appear to change in extremely strange ways:

What appears to be a single read in the source program must not be allowed to take on several values. This occurs as a result of an optimization that duplicates the read, such as rematerialization (duplicate the read instead of storing the read value in a temp), deoptimization (one tier of execution might read the value and expose it, but then deopt back to another tier that adds another read for the value), and aggressive speculation (a conditional side effect that is executed early even though a later evaluation of the condition decides the effect should not occur).

What appears as a value in memory should not fluctuate counter to program logic.  This could occur as a result of inserted writes that are innocuous in single-threaded program, such as read-modify-write accesses (write a smaller datum in terms of a larger one), spurious writes (writing back a value that was just read to the slot it was read from), and using shared memory locations as temps (writing a temporary value to a slot that will later be overwritten with a final value).

To the author's knowledge, current JITs are not affected by these constraints, though it seems possible that future JITs could be, as new "higher-level" tiers are triggered by long-running, well-typed, compute-intensive programs.  But even in that case, optimization is only inhibited when operating on shared memory.  If the JIT knows shared memory is not accessed then it will not be restricted.

#### Out-of-thin-air values

The "out of thin air" problem can be characterized as one where the compiler or hardware guesses at the value to be read from memory in a situation where that guess will result in code being executed that makes the guess correct.  It is widely believed that this is exclusively a problem with the formalization of the memory model in the presence of relaxed atomics (or data races, in our case), not a problem with existing compilers or hardware.

(The problem also presupposes the ability of the compiler to simultaneously inspect the code of two concurrent threads but it's not clear whether that matters one way or the other; on the one hand, ES will generally run threads in separate agents, which are strongly separated from each other; on the other hand, there's no rule saying a JIT can't observe multiple agent programs.)

In the present proposal, data race free programs can't manufacture values out of thin air since the absence of races makes reorderings irrelevant, but programs with races could have the problem.  However, the shared memory proposal does not have this problem because it explicitly prohibits reorderings that would cause the problem to exist.  (This is lame but it's what everyone does, more or less.)

#### Compatibility with WebAssembly

Compatibility with WebAssembly (which will have shared memory at some point) was discussed [at some length](https://github.com/tc39/ecmascript_sharedmem/issues/59).  Some high points of that discussion (along with the champion's comments) are:

* Nobody wants different "modes" for shared memory and atomics for the two languages; the languages must be compatible, with ES (initially) a subset of Wasm.  Compatibility requires some alignment at the implementation level (agreement on lock-freedom, agreement on how atomics are implemented) but nothing onerous.
* The current design for ECMAScript is very likely compatible with the forthcoming WebAssembly design, because ES is more restrictive along every dimension than WebAssembly might be.  WebAssembly will certainly have sequentially consistent atomics compatible with those of ES, and "safe" data race semantics compatible with those of ES, but will in addition have acquire-release and relaxed atomics.  Given compatible atomics, Wasm code intended to be compatible with ES code (because one calls the other) can use sequentially consistent atomics where the interaction has an impact on shared memory semantics.
* WebAssembly has unaligned memory accesses, but ES does not, so ES is strictly a subset of what WebAssembly might need.  (It will in the champion's opinion be wrong for WebAssembly to allow unaligned atomic access, but this aspect does not impact compatibility, and should WebAssembly go down that path we can expose unaligned atomics in ES through atomic operations on DataView.)
* When the WebAssembly group starts specifying shared memory we should look into a shared memory model specification for the two languages, probably based on an operational model (and probably in large part compatible with the operational level of ES's proposed model).  That may result in some tweaks to the ES model, but the ES model is currently conservative and the tweaks are not expected to be fatal.

#### Introducing new races

We can't outright ban introducing new races since racy programs may become racy in a different way when they are transformed (legally), but we'd like to guarantee that races are not introduced where there previously were none.

It is probably the case that the rules on reorderings are strong enough that any legal reordering will not introduce a new data race (where a data race is understood as a potential conflict at run-time, not necessarily an observed conflict) in any interesting sense (ie, the race becomes observable):

* In the case where the program is data race free to begin with this result is obvious, since it is  claimed already that data race freedom frees one from reasoning about reorganization.
* We can (informally, for now) talk about sections of the program that are data race free, and perhaps even subclusters of the agent cluster that are data race free (in sections), and the reasoning extends to those cases, provided we can sufficiently formalize the idea of race-free "section" and "subcluster".
* Sections of the program or subclusters that are not data race free might see additional races introduced, but these sections are already racy, and it's not obvious anyone cares: non-predictability at run-time is the expected effect of a race anyway.  (Compiler writer's motto: It's no sin to make a bad program worse.)
